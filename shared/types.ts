/**
 * Represents the critical dates and links for a specific state's election cycle.
 */
export interface ElectionRecord {
  /** Two-letter ISO state code (e.g., "MH") */
  stateCode: string;
  /** Full name of the state (e.g., "Maharashtra") */
  stateName: string;
  /** ISO date string (YYYY-MM-DD) for the voter registration deadline */
  regDeadline: string;
  /** ISO date string (YYYY-MM-DD) for the actual polling day */
  pollingDay: string;
  /** ISO date string (YYYY-MM-DD) for the commencement of vote counting */
  countingDay: string;
  /** ISO date string (YYYY-MM-DD) when official results are expected */
  resultsDay: string;
  /** Direct link to the National Voters' Service Portal (NVSP) Form 6 for new registration */
  nvspFormUrl: string;
  /** Direct link to the Electoral Search portal to find polling booths */
  boothFinderUrl: string;
}

/**
 * Defines the current status of a voter relative to the election cycle and eligibility.
 */
export enum VoterState {
  /** User does not meet minimum age or citizenship requirements */
  INELIGIBLE = 'INELIGIBLE',
  /** User will be eligible soon (e.g., 17 years old) */
  FUTURE_VOTER = 'FUTURE_VOTER',
  /** Eligible but not registered, and registration is currently open */
  REGISTRATION_GAP = 'REGISTRATION_GAP',
  /** Registration deadline has passed, but polling hasn't happened */
  DEADLINE_LOCKED = 'DEADLINE_LOCKED',
  /** Registered and ready to vote on polling day */
  READY_TO_VOTE = 'READY_TO_VOTE',
  /** Polling is currently live */
  VOTING_WINDOW_OPEN = 'VOTING_WINDOW_OPEN',
  /** Votes are cast, waiting for the counting day */
  AWAITING_RESULTS = 'AWAITING_RESULTS',
  /** Election cycle is complete */
  POST_ELECTION = 'POST_ELECTION',
}

/**
 * Captures user-specific data to determine their voter status and localized experience.
 */
export interface UserContext {
  /** The state where the user is registered or intends to vote */
  state: string;
  /** Current age of the user in years */
  age: number;
  /** Whether the user is already on the electoral roll */
  isRegistered: boolean;
  /** User's preferred language for AI communication */
  preferredLanguage: string;
}

/**
 * A structured UI component representing the primary action a user should take.
 */
export interface ActionCard {
  /** The determined voter state */
  voterState: VoterState;
  /** Crisp action phrase (max 60 chars) */
  headline: string;
  /** One sentence explanation of the action or status */
  subtext: string;
  /** Days remaining until a deadline (0 if no urgency) */
  urgencyDays: number;
  /** Ordered steps or list of required documents for the action */
  checklist: string[];
  /** Link to relevant ECI/NVSP form, null if not applicable */
  formUrl: string | null;
  /** Google Maps embed URL for the polling station or ERO office, null if not applicable */
  mapEmbedUrl: string | null;
}

/**
 * Historical and statistical data for a specific state election.
 */
export interface StateElectionStats {
  /** Name of the state */
  state: string;
  /** Total number of registered electors in the state */
  totalElectors: number;
  /** Percentage of voters who cast their ballot in the last election */
  voterTurnoutPercent: number;
  /** Number of polling stations set up across the state */
  pollingStations: number;
  /** Percentage of female electors in the total pool */
  femaleElectorPercent: number;
  /** The election year these stats refer to */
  year: number;
}

/**
 * The standard response format for the VoteDisha assessment API.
 */
export interface ApiResponse {
  /** The primary action recommended for the user */
  actionCard: ActionCard;
  /** Personalized AI explanation of the current status and next steps */
  aiExplanation: string;
  /** Unique session identifier for tracking/feedback */
  sessionId: string;
  /** Contextual election statistics for the user's state, if available */
  stateContext: StateElectionStats | null;
}

/**
 * Standard error format for API failures.
 */
export interface ApiError {
  /** Human-readable error message */
  error: string;
  /** Machine-readable error code for frontend handling */
  code: string;
}
