import { ElectionRecord } from './types';
import { NVSP_BASE_URL, BOOTH_FINDER_BASE_URL } from './constants';

/**
 * Database of critical election dates and links for major Indian states.
 *
 * @important These dates are estimates for the 2026-2029 state assembly cycles.
 * They MUST be updated based on official notifications from the Election Commission of India (ECI).
 */
export const ELECTION_DB: Record<string, ElectionRecord> = {
  Maharashtra: {
    stateCode: 'MH',
    stateName: 'Maharashtra',
    regDeadline: '2026-02-10',
    pollingDay: '2026-03-15',
    countingDay: '2026-03-18',
    resultsDay: '2026-03-19',
    nvspFormUrl: `${NVSP_BASE_URL}/#form6`,
    boothFinderUrl: `${BOOTH_FINDER_BASE_URL}?stateCode=MH`,
  },
  'Tamil Nadu': {
    stateCode: 'TN',
    stateName: 'Tamil Nadu',
    regDeadline: '2026-03-20',
    pollingDay: '2026-04-26',
    countingDay: '2026-05-04',
    resultsDay: '2026-05-05',
    nvspFormUrl: `${NVSP_BASE_URL}/#form6`,
    boothFinderUrl: `${BOOTH_FINDER_BASE_URL}?stateCode=TN`,
  },
  'West Bengal': {
    stateCode: 'WB',
    stateName: 'West Bengal',
    regDeadline: '2026-03-10',
    pollingDay: '2026-04-17',
    countingDay: '2026-05-02',
    resultsDay: '2026-05-03',
    nvspFormUrl: `${NVSP_BASE_URL}/#form6`,
    boothFinderUrl: `${BOOTH_FINDER_BASE_URL}?stateCode=WB`,
  },
  Bihar: {
    stateCode: 'BR',
    stateName: 'Bihar',
    regDeadline: '2026-09-15',
    pollingDay: '2026-10-20',
    countingDay: '2026-10-23',
    resultsDay: '2026-10-24',
    nvspFormUrl: `${NVSP_BASE_URL}/#form6`,
    boothFinderUrl: `${BOOTH_FINDER_BASE_URL}?stateCode=BR`,
  },
  'Uttar Pradesh': {
    stateCode: 'UP',
    stateName: 'Uttar Pradesh',
    regDeadline: '2027-01-10',
    pollingDay: '2027-02-10',
    countingDay: '2027-03-10',
    resultsDay: '2027-03-11',
    nvspFormUrl: `${NVSP_BASE_URL}/#form6`,
    boothFinderUrl: `${BOOTH_FINDER_BASE_URL}?stateCode=UP`,
  },
  Delhi: {
    stateCode: 'DL',
    stateName: 'Delhi',
    regDeadline: '2026-01-06',
    pollingDay: '2026-02-05',
    countingDay: '2026-02-08',
    resultsDay: '2026-02-08',
    nvspFormUrl: `${NVSP_BASE_URL}/#form6`,
    boothFinderUrl: `${BOOTH_FINDER_BASE_URL}?stateCode=DL`,
  },
  Karnataka: {
    stateCode: 'KA',
    stateName: 'Karnataka',
    regDeadline: '2028-03-20',
    pollingDay: '2028-04-26',
    countingDay: '2028-05-04',
    resultsDay: '2028-05-05',
    nvspFormUrl: `${NVSP_BASE_URL}/#form6`,
    boothFinderUrl: `${BOOTH_FINDER_BASE_URL}?stateCode=KA`,
  },
  Gujarat: {
    stateCode: 'GJ',
    stateName: 'Gujarat',
    regDeadline: '2027-10-15',
    pollingDay: '2027-11-20',
    countingDay: '2027-12-05',
    resultsDay: '2027-12-06',
    nvspFormUrl: `${NVSP_BASE_URL}/#form6`,
    boothFinderUrl: `${BOOTH_FINDER_BASE_URL}?stateCode=GJ`,
  },
  Rajasthan: {
    stateCode: 'RJ',
    stateName: 'Rajasthan',
    regDeadline: '2028-10-15',
    pollingDay: '2028-11-20',
    countingDay: '2028-12-05',
    resultsDay: '2028-12-06',
    nvspFormUrl: `${NVSP_BASE_URL}/#form6`,
    boothFinderUrl: `${BOOTH_FINDER_BASE_URL}?stateCode=RJ`,
  },
  'Andhra Pradesh': {
    stateCode: 'AP',
    stateName: 'Andhra Pradesh',
    regDeadline: '2029-03-01',
    pollingDay: '2029-04-01',
    countingDay: '2029-05-02',
    resultsDay: '2029-05-03',
    nvspFormUrl: `${NVSP_BASE_URL}/#form6`,
    boothFinderUrl: `${BOOTH_FINDER_BASE_URL}?stateCode=AP`,
  },
};

/**
 * Retrieves the election record for a given state.
 *
 * @param state - The full name of the state (e.g., "Maharashtra")
 * @returns The corresponding ElectionRecord
 * @throws Error if the state is not found in the database
 */
export function getElectionRecord(state: string): ElectionRecord {
  const record = ELECTION_DB[state];
  if (!record) {
    throw new Error('STATE_NOT_FOUND: ' + state);
  }
  return record;
}
