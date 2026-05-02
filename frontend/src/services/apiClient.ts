import { ApiResponse, UserContext, ActionCard, ApiError } from '../../../shared/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/votedisha/asia-south1';

/**
 * Custom Error class for VoteDisha API failures.
 */
export class VoteDishaError extends Error {
  constructor(public message: string, public code: string) {
    super(message);
    this.name = 'VoteDishaError';
  }
}

/**
 * Generic fetch wrapper with timeout and standard error handling.
 */
async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody: ApiError = await response.json().catch(() => ({}));
      throw new VoteDishaError(
        errorBody.error || 'Server responded with an error',
        errorBody.code || 'UNKNOWN_ERROR'
      );
    }

    return await response.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new VoteDishaError('Request timed out', 'TIMEOUT');
    }
    if (err instanceof VoteDishaError) throw err;
    const message = err instanceof Error ? err.message : 'Network failure';
    throw new VoteDishaError(message, 'NETWORK_ERROR');
  }
}

/**
 * Production-ready API service for VoteDisha.
 */
export const api = {
  /**
   * Resolves the voter's status based on age and state.
   */
  async resolveState(userContext: UserContext): Promise<ApiResponse> {
    return request<ApiResponse>('resolveState', {
      method: 'POST',
      body: JSON.stringify(userContext),
    });
  },

  /**
   * Translates an ActionCard into a target language.
   */
  async translateCard(actionCard: ActionCard, targetLanguage: string): Promise<ActionCard> {
    const response = await request<{ actionCard: ActionCard }>('translate', {
      method: 'POST',
      body: JSON.stringify({ actionCard, targetLanguage }),
    });
    return response.actionCard;
  },
};
