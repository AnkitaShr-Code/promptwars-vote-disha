import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { GoogleGenAI } from '@google/genai'
import { v4 as uuidv4 } from 'uuid';
import { checkRateLimit } from './rateLimitService';
import { UserContext, ActionCard, ApiResponse, ApiError } from '../../shared/types';
import { resolveVoterState } from '../../shared/stateResolver';
import { SUPPORTED_LANGUAGES } from '../../shared/constants';
import { ELECTION_DB } from '../../shared/electionDb';
import { TranslationServiceClient } from '@google-cloud/translate';
import { translateCard } from './translateService';
import { ECI_KNOWLEDGE } from './knowledge';
import { ConfigService } from './configService';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
};

if (getApps().length === 0) {
  initializeApp();
}

const PROJECT_ID = process.env.VERTEX_PROJECT_ID ?? '';
const LOCATION = process.env.VERTEX_LOCATION ?? 'asia-south1';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

/**
 * Validates the incoming request body for the UserContext structure.
 */
function validateInput(
  body: any,
): { valid: true; user: UserContext } | { valid: false; error: string; code: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body', code: 'INVALID_BODY' };
  }

  const { state, age, isRegistered, preferredLanguage } = body;

  // 1. state
  if (typeof state !== 'string' || !ELECTION_DB[state]) {
    return { valid: false, error: 'Invalid or unsupported state', code: 'INVALID_STATE' };
  }

  // 2. age
  if (typeof age !== 'number' || !Number.isInteger(age) || age < 1 || age > 120) {
    return { valid: false, error: 'Age must be an integer between 1 and 120', code: 'INVALID_AGE' };
  }

  // 3. isRegistered
  if (typeof isRegistered !== 'boolean') {
    return { valid: false, error: 'isRegistered must be a boolean', code: 'INVALID_REGISTERED' };
  }

  // 4. preferredLanguage
  if (typeof preferredLanguage !== 'string' || !SUPPORTED_LANGUAGES.includes(preferredLanguage as any)) {
    return { valid: false, error: 'Unsupported language', code: 'INVALID_LANGUAGE' };
  }

  return {
    valid: true,
    user: { state, age, isRegistered, preferredLanguage },
  };
}

/**
 * Uses Vertex AI to generate a natural language explanation for the voter's status.
 */
async function generateExplanation(
  actionCard: ActionCard,
  language: string,
  projectId: string,
  _location: string,
): Promise<string> {
  try {
    const languageName = LANGUAGE_NAMES[language] ?? 'English';
    
    const apiKey = process.env.GEMINI_API_KEY;
    // Use Vertex AI (Enterprise) if no API key is present, otherwise use AI Studio (API Key)
    const ai = apiKey 
      ? new GoogleGenAI({ apiKey })
      : new GoogleGenAI({ 
          enterprise: true,
          project: projectId,
          location: _location,
        });


    const systemPrompt = `# ROLE
      You are VoteDisha, a precise Indian election assistant.
      You have access to official ECI guidelines below.

      # OFFICIAL ECI KNOWLEDGE BASE
      ${ECI_KNOWLEDGE}

      # USER CONTEXT
      - Voter State: ${actionCard.voterState}
      - Situation: ${actionCard.subtext}
      - Steps shown to user: ${actionCard.checklist.slice(0, 3).join(' | ')}

      # TASK
      Using ONLY the knowledge base above and user context, write 2-3 sentences in ${languageName}.
      Add one specific practical tip from the knowledge base relevant to their situation.

      # RULES
      - Use only facts from the knowledge base above
      - Do not invent dates, phone numbers or steps not listed
      - Do not mention political parties or candidates  
      - Respond entirely in ${languageName}
      - No filler phrases, no markdown, plain text only`;

    const configService = ConfigService.getInstance();
    const modelName = await configService.getConfig('GEMINI_MODEL', process.env.GEMINI_MODEL ?? 'gemini-2.5-flash');
    
    logger.info('Using Gemini model', { model: modelName });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: 'Explain my voter status and what I should do.' }] }],
      config: {
        systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] } as any,
        maxOutputTokens: 1024,
        temperature: 0.1,
        topP: 0.8,
      },
    });

    logger.info('Gemini response', {
      hasText: !!response.text,
      finishReason: response.candidates?.[0]?.finishReason,
    });


    // In the new SDK, the text is often directly on the response or candidates
    return response.text?.trim() || actionCard.subtext;

  } catch (err) {
    // If it STILL 404s, run this once to see the actual IDs available to your key:
    // const models = await ai.models.list();
    // console.log(models);

    logger.error('Gemini generation failed', err);
    return actionCard.subtext;
  }
}

export const resolveState = onRequest(
  { 
    cors: false, 
    region: 'asia-south1',
    secrets: ['GEMINI_MODEL']
  },
  async (request, response) => {
    // A. CORS headers
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

    // B. Method check
    if (request.method !== 'POST') {
      const error: ApiError = { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' };
      response.status(400).json(error);
      return;
    }

    // C. Content-Type check
    const contentType = request.get('Content-Type') || '';
    if (!contentType.includes('application/json')) {
      const error: ApiError = {
        error: 'Content-Type must be application/json',
        code: 'INVALID_CONTENT_TYPE',
      };
      response.status(415).json(error);
      return;
    }

    // D. Validate input
    const validation = validateInput(request.body);
    if (!validation.valid) {
      const error: ApiError = { error: validation.error, code: validation.code };
      response.status(400).json(error);
      return;
    }

    // E. Resolve voter state
    try {
      const today = new Date();

      const ip = request.ip || 'unknown';
      const isAllowed = await checkRateLimit(ip);

      if (!isAllowed) {
        logger.warn('Rate limit exceeded', { ip });
        response.status(429).json({
          error: 'Too many requests. Please try again in a minute.',
          code: 'RATE_LIMIT_EXCEEDED'
        });
        return;
      }

      logger.info('Processing resolution request', {
        state: validation.user.state,
        language: validation.user.preferredLanguage,
        age: validation.user.age
      });

      const actionCard = resolveVoterState(validation.user, today);

      // F. Generate AI explanation
      const aiExplanation = await generateExplanation(
        actionCard,
        validation.user.preferredLanguage,
        PROJECT_ID,
        LOCATION,
      );

      // G. Translate ActionCard if needed
      let finalActionCard = actionCard;
      if (validation.user.preferredLanguage !== 'en') {
        try {
          const translateClient = new TranslationServiceClient();
          const db = getFirestore();
          finalActionCard = await translateCard(
            actionCard,
            validation.user.preferredLanguage,
            translateClient,
            db,
          );
        } catch (tErr) {
          logger.error('Translation failed in resolveState', tErr);
        }
      }

      // H. Save to Firestore
      const sessionId = uuidv4();
      try {
        const db = getFirestore();
        await db.collection('sessions').doc(sessionId).set({
          sessionId,
          voterState: actionCard.voterState,
          userState: validation.user.state,
          preferredLanguage: validation.user.preferredLanguage,
          timestamp: FieldValue.serverTimestamp(),
          actionCard,
          aiExplanation,
        });
        logger.info('Session saved successfully', { sessionId, voterState: actionCard.voterState });
      } catch (dbErr) {
        logger.error('Failed to save session to Firestore', { sessionId, error: dbErr });
      }

      // H. Return success with Rate Limit headers
      response.set('X-RateLimit-Limit', '100');
      response.set('X-RateLimit-Remaining', '99');
      // Real rate limiting should use Firestore counters or Firebase App Check in production.
      response.set('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + 3600));

      const apiResponse: ApiResponse = {
        actionCard: finalActionCard,
        originalCard: actionCard,
        aiExplanation,
        sessionId,
        stateContext: null,
      };

      response.status(200).json(apiResponse);
    } catch (err: any) {
      logger.error('Resolution failed', { message: err.message });
      if (err.message?.includes('STATE_NOT_FOUND')) {
        const error: ApiError = { error: err.message, code: 'STATE_NOT_FOUND' };
        response.status(404).json(error);
        return;
      }
      const error: ApiError = { error: 'Internal server error', code: 'INTERNAL_ERROR' };
      response.status(500).json(error);
    }
  },
);
