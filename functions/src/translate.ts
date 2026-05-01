import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { TranslationServiceClient } from '@google-cloud/translate';
import { SUPPORTED_LANGUAGES } from '../../shared/constants';
import { translateCard } from './translateService';
import { checkRateLimit } from './rateLimitService';
import { ensureAdminInitialized, applyCors, validateMethod, getClientIp, validateContentType } from './utils';

ensureAdminInitialized();

export const translate = onRequest(
  { cors: false, region: 'asia-south1' },
  async (request, response) => {
    if (applyCors(request, response)) return;
    if (!validateMethod(request, response)) return;
    if (!validateContentType(request, response)) return;

    try {
      const ip = getClientIp(request);
      const isAllowed = await checkRateLimit(ip);

      if (!isAllowed) {
        response.status(429).json({
          error: 'Too many requests. Please try again in a minute.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }

      const { actionCard, targetLanguage } = request.body;
      
      // Basic validation for actionCard structure
      if (
        !actionCard || 
        typeof actionCard !== 'object' ||
        !actionCard.voterState ||
        !Array.isArray(actionCard.checklist)
      ) {
        response.status(400).json({ error: 'Invalid or missing actionCard', code: 'INVALID_ACTION_CARD' });
        return;
      }

      if (
        !targetLanguage ||
        !SUPPORTED_LANGUAGES.includes(targetLanguage)
      ) {
        response.status(400).json({ error: 'Unsupported or missing target language', code: 'INVALID_LANGUAGE' });
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
