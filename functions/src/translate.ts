import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { TranslationServiceClient } from '@google-cloud/translate';
import { SUPPORTED_LANGUAGES } from '../../shared/constants';
import { translateCard } from './translateService';
import { checkRateLimit } from './rateLimitService';
import { ActionCard } from '../../shared/types';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

export const translate = onRequest(
  { cors: false, region: 'asia-south1' },
  async (request, response) => {
    const origin = request.headers.origin || '';
    const isLocalhost = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
    const isProduction = 
      origin === FRONTEND_ORIGIN || 
      origin.endsWith('.web.app') || 
      origin.endsWith('.firebaseapp.com') ||
      origin.endsWith('.run.app');

    const allowedOrigin = (isLocalhost || isProduction) ? origin : FRONTEND_ORIGIN;

    response.set('Access-Control-Allow-Origin', allowedOrigin);
    response.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    try {
      if (request.method !== 'POST') {
        response.status(400).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
        return;
      }

      const ip = request.ip || 'unknown';
      const isAllowed = await checkRateLimit(ip);

      if (!isAllowed) {
        response.status(429).json({
          error: 'Too many requests. Please try again in a minute.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }

      const { actionCard, targetLanguage } = request.body;
      if (
        !actionCard ||
        !targetLanguage ||
        !SUPPORTED_LANGUAGES.includes(targetLanguage)
      ) {
        response.status(400).json({ error: 'Invalid input parameters', code: 'INVALID_INPUT' });
        return;
      }

      const client = new TranslationServiceClient({
        apiEndpoint: 'translate.googleapis.com',
      });
      const db = getFirestore();

      const translated = await translateCard(actionCard, targetLanguage, client, db);
      response.status(200).json({ actionCard: translated });
    } catch (err) {
      logger.error('Translation handler failed', err);
      response.status(500).json({ error: 'Translation failed', code: 'TRANSLATION_ERROR' });
    }
  },
);
