import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

const LIMIT = 30; // requests per window
const WINDOW_SECONDS = 60; // 1 minute window

/**
 * Basic rate limiting service using Firestore.
 * In a high-traffic production app, Redis would be used for lower latency.
 */
export async function checkRateLimit(ip: string): Promise<boolean> {
  const db = getFirestore();
  const now = Math.floor(Date.now() / 1000);
  const windowKey = Math.floor(now / WINDOW_SECONDS);
  const docPath = `rateLimits/${ip}_${windowKey}`;

  try {
    const docRef = db.doc(docPath);
    
    // We use a transaction to safely increment and check
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(docRef);
      if (!doc.exists) {
        t.set(docRef, { count: 1, expiresAt: now + WINDOW_SECONDS });
        return true;
      }
      
      const data = doc.data();
      if (data && data.count >= LIMIT) {
        return false;
      }
      
      t.update(docRef, { count: FieldValue.increment(1) });
      return true;
    });

    return result;
  } catch (err) {
    logger.error('Rate limit check failed, defaulting to allow', { ip, error: err });
    return true; // Fail open to not block users on DB issues
  }
}
