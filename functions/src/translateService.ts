import * as logger from 'firebase-functions/logger';
import { Firestore } from 'firebase-admin/firestore';
import { TranslationServiceClient } from '@google-cloud/translate';
import { ActionCard } from '../../shared/types';
import { createHash } from 'crypto';

const PROJECT_ID = process.env.VERTEX_PROJECT_ID ?? '';

export function hashString(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export async function translateText(
  text: string,
  targetLanguage: string,
  originalText: string,
  client: TranslationServiceClient,
): Promise<string> {
  // Aggressively strip any and all existing prefixes (e.g. "[HI] [HI] ")
  const cleanText = text.replace(/^(\[[A-Z]{2}\]\s*)+/, '').trim();

  if (targetLanguage === 'en') {
    return cleanText;
  }

  if (!cleanText) return originalText;

  try {
    const parent = `projects/${PROJECT_ID}/locations/global`;
    const [response] = await client.translateText({
      parent,
      contents: [cleanText],
      mimeType: 'text/plain',
      targetLanguageCode: targetLanguage,
    });

    const translated = response.translations?.[0]?.translatedText;
    return translated || originalText;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Translation API failed', { targetLanguage, error: message });
    return originalText;
  }
}

export async function getCachedTranslation(
  cacheKey: string,
  db: Firestore,
): Promise<string | null> {
  try {
    const doc = await db.collection('translationCache').doc(cacheKey).get();
    if (doc.exists && doc.data()?.text) {
      return doc.data()?.text as string;
    }
    return null;
  } catch (err: unknown) {
    return null;
  }
}

export async function setCachedTranslation(
  cacheKey: string,
  text: string,
  db: Firestore,
): Promise<void> {
  try {
    await db.collection('translationCache').doc(cacheKey).set({
      text,
      createdAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Failed to set cache', { cacheKey, error: message });
  }
}

export async function translateWithCache(
  text: string,
  targetLanguage: string,
  client: TranslationServiceClient,
  db: Firestore,
): Promise<string> {
  try {
    if (targetLanguage === 'en') {
      return text.replace(/^(\[[A-Z]{2}\]\s*)+/, '').trim();
    }

    const cleanText = text.replace(/^(\[[A-Z]{2}\]\s*)+/, '').trim();
    const cacheKey = exports.hashString(`${cleanText}:${targetLanguage}`);
    const cached = await exports.getCachedTranslation(cacheKey, db);
    if (cached) {
      return cached.replace(/^(\[[A-Z]{2}\]\s*)+/, '').trim();
    }

    const translated = await exports.translateText(text, targetLanguage, text, client);
    exports.setCachedTranslation(cacheKey, translated, db).catch(() => { });

    return translated;
  } catch (err: unknown) {
    logger.error('translateWithCache failed', {
      targetLanguage,
      err: err instanceof Error ? err.message : String(err)
    });
    // Return clean original text as fallback
    return text.replace(/^(\[[A-Z]{2}\]\s*)+/, '').trim();
  }
}

export async function translateCard(
  actionCard: ActionCard,
  targetLanguage: string,
  client: TranslationServiceClient,
  db: Firestore,
): Promise<ActionCard> {
  try {

    // Translate headline and subtext in parallel (just 2 calls)
    const [headline, subtext] = await Promise.all([
      exports.translateWithCache(actionCard.headline, targetLanguage, client, db),
      exports.translateWithCache(actionCard.subtext, targetLanguage, client, db),
    ]);

    // Translate checklist items sequentially to avoid rate limiting
    const checklist: string[] = [];
    for (const item of actionCard.checklist) {
      const translated = await exports.translateWithCache(item, targetLanguage, client, db);
      checklist.push(translated);
    }

    return {
      ...actionCard,
      headline,
      subtext,
      checklist,
    };
  } catch (err: unknown) {
    logger.error('translateCard failed', {
      voterState: actionCard.voterState,
      targetLanguage,
      err: err instanceof Error ? err.message : String(err)
    });
    // Return original English card as fallback — never crash
    return actionCard;
  }
}
