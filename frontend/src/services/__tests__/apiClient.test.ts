import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, VoteDishaError } from '../apiClient';
import { VoterState } from '../../../../shared/types';

describe('apiClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  describe('resolveState', () => {
    it('returns response on success', async () => {
      const mockResponse = { voterState: VoterState.READY_TO_VOTE, aiExplanation: 'Test' };
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.resolveState({
        state: 'Maharashtra',
        age: 25,
        isRegistered: true,
        preferredLanguage: 'en',
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/resolveState'), expect.any(Object));
    });
  });

  describe('translateCard', () => {
    it('returns translated card', async () => {
      const mockCard = { headline: 'Hello' } as any;
      const mockTranslated = { headline: 'Namaste' } as any;
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ actionCard: mockTranslated }),
      });

      const result = await api.translateCard(mockCard, 'hi');
      expect(result).toEqual(mockTranslated);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/translate'), expect.any(Object));
    });
  });

  describe('translateText', () => {
    it('returns original text early if language is en', async () => {
      const result = await api.translateText('Hello', 'en');
      expect(result).toBe('Hello');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('wraps text in ActionCard and extracts translated headline', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          actionCard: { headline: 'Namaste' }
        }),
      });

      const result = await api.translateText('Hello', 'hi');
      expect(result).toBe('Namaste');
    });

    it('falls back to original text on API failure', async () => {
      (fetch as any).mockResolvedValue({ ok: false });
      const result = await api.translateText('Hello', 'hi');
      expect(result).toBe('Hello');
    });

    it('falls back to original text if response headline is missing', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ actionCard: {} }),
      });

      const result = await api.translateText('Hello', 'hi');
      expect(result).toBe('Hello');
    });

    it('falls back to original text on network error', async () => {
      (fetch as any).mockRejectedValue(new Error('Network Down'));
      const result = await api.translateText('Hello', 'hi');
      expect(result).toBe('Hello');
    });
  });

  describe('request helper error handling', () => {
    it('handles timeout (AbortError)', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      (fetch as any).mockRejectedValueOnce(abortError);

      await expect(api.resolveState({} as any)).rejects.toThrow('Request timed out');
    });

    it('handles non-ok response with error body', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Bad Request', code: 'INVALID' }),
      });

      try {
        await api.resolveState({} as any);
      } catch (err: any) {
        expect(err.message).toBe('Bad Request');
        expect(err.code).toBe('INVALID');
      }
    });

    it('handles non-ok response without error body', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => { throw new Error('No JSON'); },
      });

      try {
        await api.resolveState({} as any);
      } catch (err: any) {
        expect(err.message).toBe('Server responded with an error');
        expect(err.code).toBe('UNKNOWN_ERROR');
      }
    });

    it('handles network failure with non-Error object', async () => {
      (fetch as any).mockRejectedValueOnce('String Error');

      try {
        await api.resolveState({} as any);
      } catch (err: any) {
        expect(err.message).toBe('Network failure');
        expect(err.code).toBe('NETWORK_ERROR');
      }
    });
  });
});
