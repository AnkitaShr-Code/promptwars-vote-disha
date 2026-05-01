/**
 * List of languages supported by the VoteDisha AI assistant.
 */
export const SUPPORTED_LANGUAGES = ['en', 'hi', 'mr', 'ta', 'te', 'bn'] as const;

/**
 * Type derived from supported language codes.
 */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Native labels for supported languages.
 */
export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  bn: 'বাংলা',
};

/**
 * English names of supported languages for AI prompts.
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
};

/**
 * Minimum legal age to cast a vote in India.
 */
export const MIN_VOTER_AGE = 18;

/**
 * Maximum age for a user to be considered a 'Future Voter' in the onboarding flow.
 */
export const FUTURE_VOTER_MAX_AGE = 21;

/**
 * Base URL for the National Voters' Service Portal.
 */
export const NVSP_BASE_URL = 'https://voters.eci.gov.in';

/**
 * Base URL for the Electoral Search portal.
 */
export const BOOTH_FINDER_BASE_URL = 'https://electoralsearch.eci.gov.in';

/**
 * Primary states tracked in the current version of VoteDisha.
 */
export const ELECTION_STATES = [
  'Maharashtra',
  'Tamil Nadu',
  'West Bengal',
  'Bihar',
  'Uttar Pradesh',
  'Delhi',
  'Karnataka',
  'Gujarat',
  'Rajasthan',
  'Andhra Pradesh',
] as const;

/**
 * Type derived from tracked election states.
 */
export type ElectionState = (typeof ELECTION_STATES)[number];
