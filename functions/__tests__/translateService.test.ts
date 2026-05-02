import { 
  translateCard, 
  translateText, 
  getCachedTranslation, 
  setCachedTranslation, 
  translateWithCache,
  hashString
} from '../src/translateService';
import { ActionCard, VoterState } from '../../shared/types';
import * as logger from 'firebase-functions/logger';

jest.mock('firebase-functions/logger');

describe('translateService coverage', () => {
  const mockActionCard: ActionCard = {
    voterState: VoterState.REGISTRATION_GAP,
    headline: 'You have 40 days left',
    subtext: 'Get registered now.',
    checklist: ['Download Form 6'],
    urgencyDays: 40,
    formUrl: 'https://voters.eci.gov.in',
    mapEmbedUrl: null,
  };

  const mockTranslateClient = {
    translateText: jest.fn().mockResolvedValue([{
      translations: [{ translatedText: 'TRANSLATED_TEXT' }]
    }]),
  } as any;

  const mockDb = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ exists: false }),
    set: jest.fn().mockResolvedValue({}),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('translateText', () => {
    test('returns clean text directly if language is en', async () => {
      const result = await translateText('[HI] Hello', 'en', 'Hello', mockTranslateClient);
      expect(result).toBe('Hello');
    });

    test('returns original text if clean text is empty', async () => {
      const result = await translateText('[HI] ', 'hi', 'Original', mockTranslateClient);
      expect(result).toBe('Original');
    });

    test('handles API failure', async () => {
      mockTranslateClient.translateText.mockRejectedValueOnce(new Error('API Down'));
      const result = await translateText('Hello', 'hi', 'Original', mockTranslateClient);
      expect(result).toBe('Original');
    });

    test('handles non-Error objects in catch', async () => {
      mockTranslateClient.translateText.mockRejectedValueOnce('string error');
      const result = await translateText('Hello', 'hi', 'Original', mockTranslateClient);
      expect(result).toBe('Original');
    });

    test('handles empty translation result', async () => {
      mockTranslateClient.translateText.mockResolvedValueOnce([{ translations: [] }]);
      const result = await translateText('Hello', 'hi', 'Original', mockTranslateClient);
      expect(result).toBe('Original');
    });
  });

  describe('getCachedTranslation', () => {
    test('returns cached text if exists', async () => {
      mockDb.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ text: 'CACHED' })
      });
      const result = await getCachedTranslation('key', mockDb);
      expect(result).toBe('CACHED');
    });

    test('returns null if doc missing data', async () => {
      mockDb.get.mockResolvedValueOnce({ exists: true, data: () => ({}) });
      const result = await getCachedTranslation('key', mockDb);
      expect(result).toBeNull();
    });

    test('returns null on Firestore error', async () => {
      mockDb.get.mockRejectedValueOnce(new Error('DB Fail'));
      const result = await getCachedTranslation('key', mockDb);
      expect(result).toBeNull();
    });

    test('handles non-Error objects in Firestore catch', async () => {
      mockDb.get.mockRejectedValueOnce('DB Fail');
      const result = await getCachedTranslation('key', mockDb);
      expect(result).toBeNull();
    });
  });

  describe('setCachedTranslation', () => {
    test('logs error on Firestore failure', async () => {
      mockDb.set.mockRejectedValueOnce(new Error('DB Fail'));
      await setCachedTranslation('key', 'text', mockDb);
      expect(logger.error).toHaveBeenCalled();
    });

    test('handles non-Error objects in set catch', async () => {
      mockDb.set.mockRejectedValueOnce('DB Fail');
      await setCachedTranslation('key', 'text', mockDb);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('translateWithCache', () => {
    test('returns early for en', async () => {
      const result = await translateWithCache('[HI] Hello', 'en', mockTranslateClient, mockDb);
      expect(result).toBe('Hello');
    });

    test('uses cache if available', async () => {
      mockDb.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ text: 'CACHED' })
      });
      const result = await translateWithCache('Hello', 'hi', mockTranslateClient, mockDb);
      expect(result).toBe('CACHED');
      expect(mockTranslateClient.translateText).not.toHaveBeenCalled();
    });
  });

  describe('translateCard', () => {
    test('translates all fields', async () => {
      const result = await translateCard(mockActionCard, 'hi', mockTranslateClient, mockDb);
      expect(result.headline).toBe('TRANSLATED_TEXT');
      expect(result.subtext).toBe('TRANSLATED_TEXT');
      expect(result.checklist[0]).toBe('TRANSLATED_TEXT');
    });
  });

  describe('translateWithCache error handling', () => {
    it('returns clean original text when an unexpected error occurs', async () => {
      const translateModule = require('../src/translateService');
      const spy = jest.spyOn(translateModule, 'getCachedTranslation').mockRejectedValueOnce(new Error('Unexpected DB failure'));
      
      const result = await translateModule.translateWithCache('Hello world', 'hi', mockTranslateClient, mockDb);
      expect(result).toBe('Hello world');
      spy.mockRestore();
    });

    it('returns prefix-stripped text when error occurs with prefixed input', async () => {
      const translateModule = require('../src/translateService');
      const spy = jest.spyOn(translateModule, 'getCachedTranslation').mockRejectedValueOnce(new Error('failure'));
      
      const result = await translateModule.translateWithCache('[HI] Hello world', 'mr', mockTranslateClient, mockDb);
      expect(result).toBe('Hello world');
      spy.mockRestore();
    });

    it('handles non-Error objects in catch block', async () => {
      const translateModule = require('../src/translateService');
      const spy = jest.spyOn(translateModule, 'getCachedTranslation').mockRejectedValueOnce('String Error');
      
      const result = await translateModule.translateWithCache('Hello', 'hi', mockTranslateClient, mockDb);
      expect(result).toBe('Hello');
      spy.mockRestore();
    });
  });

  describe('translateCard error handling', () => {
    it('returns original actionCard when translation pipeline fails', async () => {
      const translateModule = require('../src/translateService');
      const spy = jest.spyOn(translateModule, 'translateWithCache').mockRejectedValueOnce(new Error('Total failure'));

      const originalCard: ActionCard = { ...mockActionCard };
      const result = await translateModule.translateCard(originalCard, 'hi', mockTranslateClient, mockDb);
      
      expect(result).toEqual(originalCard);
      spy.mockRestore();
    });

    it('preserves all ActionCard fields on fallback', async () => {
      const translateModule = require('../src/translateService');
      const spy = jest.spyOn(translateModule, 'translateWithCache').mockRejectedValueOnce(new Error('failure'));

      const result = await translateModule.translateCard(mockActionCard, 'ta', mockTranslateClient, mockDb);
      
      expect(result.voterState).toBe(mockActionCard.voterState);
      expect(result.urgencyDays).toBe(mockActionCard.urgencyDays);
      spy.mockRestore();
    });

    it('handles non-Error objects in catch block', async () => {
      const translateModule = require('../src/translateService');
      const spy = jest.spyOn(translateModule, 'translateWithCache').mockRejectedValueOnce('String Error');

      const result = await translateModule.translateCard(mockActionCard, 'hi', mockTranslateClient, mockDb);
      expect(result).toEqual(mockActionCard);
      spy.mockRestore();
    });
  });
});
