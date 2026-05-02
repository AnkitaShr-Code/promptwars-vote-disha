import { getFirestore } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';

/**
 * Service to manage dynamic configuration without requiring service redeployment.
 */
export class ConfigService {
  private static instance: ConfigService;
  private cache: Record<string, string> = {};
  private lastFetch: number = 0;
  private readonly TTL = 60 * 1000; // 1 minute cache

  private constructor() {}

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Gets a configuration value from Firestore with a fallback to environment variables.
   * 
   * @param key - The config key
   * @param envValue - The value from process.env
   * @returns The most recent configuration value
   */
  public async getConfig(key: string, envValue?: string): Promise<string> {
    const now = Date.now();
    
    // Return cached value if within TTL
    if (this.cache[key] && (now - this.lastFetch < this.TTL)) {
      return this.cache[key];
    }

    try {
      const db = getFirestore();
      const doc = await db.collection('configs').doc('global').get();
      
      if (doc.exists) {
        const data = doc.data();
        if (data && data[key]) {
          this.cache[key] = data[key];
          this.lastFetch = now;
          logger.info(`Config fetched from Firestore: ${key}=${data[key]}`);
          return data[key];
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Failed to fetch config from Firestore: ${key}`, { error: message });
    }

    // Fallback to environment variable or provided default
    return envValue || '';
  }
}
