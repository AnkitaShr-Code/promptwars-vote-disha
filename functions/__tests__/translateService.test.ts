import { translateCard } from '../src/translateService';
import { ActionCard, VoterState } from '../../shared/types';

describe('translateService — translateCard', () => {
  const mockActionCard: ActionCard = {
    voterState: VoterState.REGISTRATION_GAP,
    headline: 'You have 40 days left',
    subtext: 'Get registered now.',
    checklist: ['Download Form 6', 'Submit to BLO'],
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
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false }),
        set: jest.fn().mockResolvedValue({}),
      }),
    }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('translates headline and subtext', async () => {
    const result = await translateCard(mockActionCard, 'hi', mockTranslateClient, mockDb);
    
    expect(result.headline).toBe('TRANSLATED_TEXT');
    expect(result.subtext).toBe('TRANSLATED_TEXT');
    expect(mockTranslateClient.translateText).toHaveBeenCalled();
  });

  test('translates checklist items', async () => {
    const result = await translateCard(mockActionCard, 'hi', mockTranslateClient, mockDb);
    
    expect(result.checklist).toHaveLength(2);
    expect(result.checklist[0]).toBe('TRANSLATED_TEXT');
    expect(result.checklist[1]).toBe('TRANSLATED_TEXT');
  });

  test('uses cached value if available', async () => {
    mockDb.collection().doc().get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ text: 'CACHED_TEXT' })
    });

    const result = await translateCard(mockActionCard, 'hi', mockTranslateClient, mockDb);
    
    // First call (headline) should be cached
    expect(result.headline).toBe('CACHED_TEXT');
    // Subsequent calls would hit the mock resolved value unless we mock them too
  });

  test('skips translation if target is "en"', async () => {
    const result = await translateCard(mockActionCard, 'en', mockTranslateClient, mockDb);
    
    expect(result.headline).toBe(mockActionCard.headline);
    expect(mockTranslateClient.translateText).not.toHaveBeenCalled();
  });

  test('handles translation API failure by falling back to original text', async () => {
    mockTranslateClient.translateText.mockRejectedValueOnce(new Error('API Down'));
    
    const result = await translateCard(mockActionCard, 'hi', mockTranslateClient, mockDb);
    
    // Headline fails, falls back to original
    expect(result.headline).toBe(mockActionCard.headline);
  });
});
