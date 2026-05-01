import { VoterState, UserContext, ActionCard, ElectionRecord } from './types';
import { getElectionRecord } from './electionDb';
import { MIN_VOTER_AGE } from './constants';

/**
 * Computes the number of full days between two dates, stripping time components.
 *
 * @param from - The starting date
 * @param to - The target date
 * @returns Number of full days (0 if to is in the past or same day)
 */
export function computeDaysUntil(from: Date, to: Date): number {
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());

  if (end <= start) {
    return 0;
  }

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end - start) / msPerDay);
}

/**
 * Resolves the user's voter state and generates the appropriate action card.
 *
 * @param user - The current user context
 * @param today - The current date reference
 * @returns A structured ActionCard based on eligibility and election timeline
 */
export function resolveVoterState(user: UserContext, today: Date): ActionCard {
  // Step 1: INELIGIBLE
  if (user.age < MIN_VOTER_AGE) {
    return {
      voterState: VoterState.INELIGIBLE,
      headline: 'You are not yet eligible to vote',
      subtext: 'The minimum voting age in India is 18 years.',
      urgencyDays: 0,
      checklist: [
        'You can still learn about the election process',
        'Register at voters.eci.gov.in when you turn 18',
        'Check your local candidates and party manifestos',
      ],
      formUrl: null,
      mapEmbedUrl: null,
    };
  }

  // Step 2: Get election record
  const record: ElectionRecord = getElectionRecord(user.state);

  const regDeadline = new Date(record.regDeadline + 'T00:00:00Z');
  const pollingDay = new Date(record.pollingDay + 'T00:00:00Z');
  const countingDay = new Date(record.countingDay + 'T00:00:00Z');
  const resultsDay = new Date(record.resultsDay + 'T00:00:00Z');

  // Step 3: POST_ELECTION
  if (today > resultsDay) {
    return {
      voterState: VoterState.POST_ELECTION,
      headline: 'The election is complete',
      subtext: `Results have been declared for ${record.stateName}.`,
      urgencyDays: 0,
      checklist: [
        'Check the official results on results.eci.gov.in',
        'Your elected representative is now in office',
        'Stay engaged — track your representative\'s work',
      ],
      formUrl: null,
      mapEmbedUrl: null,
    };
  }

  // Step 4: AWAITING_RESULTS
  if (today >= countingDay && today <= resultsDay) {
    return {
      voterState: VoterState.AWAITING_RESULTS,
      headline: 'Votes are being counted',
      subtext: `Results for ${record.stateName} are expected soon.`,
      urgencyDays: computeDaysUntil(today, resultsDay),
      checklist: [
        'Follow live updates on results.eci.gov.in',
        `Results expected on ${record.resultsDay}`,
        'Share the results with your community',
      ],
      formUrl: null,
      mapEmbedUrl: null,
    };
  }

  // Step 5: VOTING_WINDOW_OPEN
  if (today >= pollingDay && today < countingDay) {
    return {
      voterState: VoterState.VOTING_WINDOW_OPEN,
      headline: 'Today is polling day — go vote!',
      subtext: `Polling is live in ${record.stateName} today.`,
      urgencyDays: 0,
      checklist: [
        'Carry your Voter ID card or Aadhaar card',
        'Check your booth address on electoralsearch.eci.gov.in',
        'Polling hours are typically 7 AM to 6 PM',
        'Ink will be marked on your left index finger',
      ],
      formUrl: null,
      mapEmbedUrl: record.boothFinderUrl,
    };
  }

  // Step 6: DEADLINE_LOCKED
  if (today > regDeadline && !user.isRegistered) {
    return {
      voterState: VoterState.DEADLINE_LOCKED,
      headline: 'Registration deadline has passed',
      subtext: `You cannot register for this election cycle in ${record.stateName}.`,
      urgencyDays: 0,
      checklist: [
        'Mark your calendar for the next election',
        'Register early at voters.eci.gov.in',
        'Check if you are already registered at electoralsearch.eci.gov.in',
        `Deadline was ${record.regDeadline}`,
      ],
      formUrl: record.nvspFormUrl,
      mapEmbedUrl: null,
    };
  }

  // Step 7: REGISTRATION_GAP
  if (today <= regDeadline && !user.isRegistered) {
    const daysUntil = computeDaysUntil(today, regDeadline);
    return {
      voterState: VoterState.REGISTRATION_GAP,
      headline: `Register now — ${daysUntil} days left`,
      subtext: `You are eligible but not yet registered in ${record.stateName}.`,
      urgencyDays: daysUntil,
      checklist: [
        'Visit voters.eci.gov.in and click \'New Registration\'',
        'Fill Form 6 online (takes 5–10 minutes)',
        'Required: Aadhaar card',
        'Required: Proof of address (utility bill, bank statement)',
        'Required: One passport-size photograph',
        `Deadline: ${record.regDeadline}`,
      ],
      formUrl: record.nvspFormUrl,
      mapEmbedUrl: null,
    };
  }

  // Step 8: READY_TO_VOTE (default)
  const daysUntilPolling = computeDaysUntil(today, pollingDay);
  return {
    voterState: VoterState.READY_TO_VOTE,
    headline: `You are registered — polling in ${daysUntilPolling} days`,
    subtext: `You are all set to vote in ${record.stateName}.`,
    urgencyDays: daysUntilPolling,
    checklist: [
      'Verify your name on the electoral roll at electoralsearch.eci.gov.in',
      'Note your polling booth address',
      'Carry your Voter ID or any valid photo ID on polling day',
      `Polling day: ${record.pollingDay}`,
    ],
    formUrl: null,
    mapEmbedUrl: record.boothFinderUrl,
  };
}
