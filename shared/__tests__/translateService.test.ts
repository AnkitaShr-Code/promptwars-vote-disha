import { hashString, getCachedTranslation, setCachedTranslation, translateText } from '../../functions/src/translateService';
import * as logger from 'firebase-functions/logger';

jest.mock('firebase-functions/logger');
jest.mock('firebase-admin/firestore');
jest.mock('@google-cloud/translate');

describe('translateService coverage', () => {
  describe('hashString', () => {
    test('returns a 16-character string', () => {
      expect(hashString('hello:hi')).toHaveLength(16);
    });

    test('returns consistent output for same input', () => {
      expect(hashString('test')).toBe(hashString('test'));
    });

    test('returns different output for different inputs', () => {
      expect(hashString('a')).not.toBe(hashString('b'));
    });
  });

  describe('translateText', () => {
    const mockClient = {
      translateText: jest.fn(),
    } as any;

    test('returns clean text directly if language is en', async () => {
      const result = await translateText('[HI] Hello', 'en', 'Hello', mockClient);
      expect(result).toBe('Hello');
    });

    test('returns original text if clean text is empty', async () => {
      const result = await translateText('[HI] ', 'hi', 'Original', mockClient);
      expect(result).toBe('Original');
    });

    test('returns original text if translation result is empty', async () => {
      mockClient.translateText.mockResolvedValueOnce([{
        translations: []
      }]);
      const result = await translateText('Hello', 'hi', 'Original', mockClient);
      expect(result).toBe('Original');
    });

    test('returns formatted translation with prefix', async () => {
      mockClient.translateText.mockResolvedValueOnce([{
        translations: [{ translatedText: 'Namaste' }]
      }]);
      const result = await translateText('Hello', 'hi', 'Original', mockClient);
      expect(result).toBe('[HI] Namaste');
    });
  });

  describe('getCachedTranslation', () => {
    const mockDb = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn(),
    } as any;

    test('returns null when Firestore throws', async () => {
      mockDb.get.mockRejectedValueOnce(new Error('Firestore error'));
      const result = await getCachedTranslation('key', mockDb);
      expect(result).toBeNull();
    });

    test('does not throw when Firestore fails', async () => {
      mockDb.get.mockRejectedValueOnce(new Error('Firestore error'));
      await expect(getCachedTranslation('key', mockDb)).resolves.toBeNull();
    });
  });

  describe('setCachedTranslation', () => {
    const mockDb = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn(),
    } as any;

    test('does not throw when Firestore write fails', async () => {
      mockDb.set.mockRejectedValueOnce(new Error('Firestore write error'));
      await expect(setCachedTranslation('key', 'text', mockDb)).resolves.toBeUndefined();
    });

    test('silently handles write failure', async () => {
      const consoleSpy = jest.spyOn(logger, 'error');
      mockDb.set.mockRejectedValueOnce(new Error('Firestore write error'));
      await setCachedTranslation('key', 'text', mockDb);
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
