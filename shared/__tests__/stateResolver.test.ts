import { resolveVoterState, computeDaysUntil } from '../stateResolver';
import { VoterState, ActionCard } from '../types';
import { ELECTION_DB } from '../electionDb';

const BEFORE_REG = new Date('2026-01-01T00:00:00Z');
const ON_REG_DEADLINE = new Date('2026-02-10T00:00:00Z');
const AFTER_REG = new Date('2026-02-11T00:00:00Z');
const ON_POLLING_DAY = new Date('2026-03-15T00:00:00Z');
const ON_COUNTING_DAY = new Date('2026-03-18T00:00:00Z');
const ON_RESULTS_DAY = new Date('2026-03-19T00:00:00Z');
const AFTER_RESULTS = new Date('2026-03-20T00:00:00Z');

function validateCard(card: ActionCard) {
  expect(Object.values(VoterState)).toContain(card.voterState);
  expect(card.headline.length).toBeLessThanOrEqual(60);
  expect(Array.isArray(card.checklist)).toBe(true);
  expect(card.urgencyDays).toBeGreaterThanOrEqual(0);
}

describe('computeDaysUntil', () => {
  test('from and to same day → returns 0', () => {
    const d = new Date('2026-01-01T12:00:00Z');
    expect(computeDaysUntil(d, d)).toBe(0);
  });

  test('to is in the past → returns 0', () => {
    const from = new Date('2026-01-02T00:00:00Z');
    const to = new Date('2026-01-01T00:00:00Z');
    expect(computeDaysUntil(from, to)).toBe(0);
  });

  test('exactly 1 day apart → returns 1', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-02T00:00:00Z');
    expect(computeDaysUntil(from, to)).toBe(1);
  });

  test('exactly 30 days apart → returns 30', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const to = new Date('2026-01-31T00:00:00Z');
    expect(computeDaysUntil(from, to)).toBe(30);
  });

  test('time of day must not affect result', () => {
    const from = new Date('2026-01-01T23:59:59Z');
    const to = new Date('2026-01-02T00:00:01Z');
    expect(computeDaysUntil(from, to)).toBe(1);
  });
});

describe('resolveVoterState — INELIGIBLE', () => {
  const userBase = { state: 'Maharashtra', isRegistered: false, preferredLanguage: 'en' };

  test('age 16, registered=true → voterState === INELIGIBLE', () => {
    const card = resolveVoterState({ ...userBase, age: 16, isRegistered: true }, BEFORE_REG);
    expect(card.voterState).toBe(VoterState.INELIGIBLE);
  });

  test('age 17, registered=false → voterState === INELIGIBLE', () => {
    const card = resolveVoterState({ ...userBase, age: 17 }, BEFORE_REG);
    expect(card.voterState).toBe(VoterState.INELIGIBLE);
  });

  test('age 17 → headline is non-empty string', () => {
    const card = resolveVoterState({ ...userBase, age: 17 }, BEFORE_REG);
    expect(card.headline.length).toBeGreaterThan(0);
  });

  test('age 17 → checklist.length >= 1', () => {
    const card = resolveVoterState({ ...userBase, age: 17 }, BEFORE_REG);
    expect(card.checklist.length).toBeGreaterThanOrEqual(1);
  });

  test('age 17 → urgencyDays === 0', () => {
    const card = resolveVoterState({ ...userBase, age: 17 }, BEFORE_REG);
    expect(card.urgencyDays).toBe(0);
  });

  test('age 17 → formUrl === null', () => {
    const card = resolveVoterState({ ...userBase, age: 17 }, BEFORE_REG);
    expect(card.formUrl).toBeNull();
  });
});

describe('resolveVoterState — REGISTRATION_GAP', () => {
  const user = { state: 'Maharashtra', age: 25, isRegistered: false, preferredLanguage: 'en' };

  test('voterState === REGISTRATION_GAP', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.voterState).toBe(VoterState.REGISTRATION_GAP);
  });

  test('urgencyDays > 0', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.urgencyDays).toBeGreaterThan(0);
  });

  test('urgencyDays === 40', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.urgencyDays).toBe(40);
  });

  test('headline contains "days left"', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.headline).toMatch(/days left/);
  });

  test('checklist contains at least one item with "Form 6"', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.checklist.some((item) => item.includes('Form 6'))).toBe(true);
  });

  test('formUrl is not null', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.formUrl).not.toBeNull();
  });

  test('mapEmbedUrl === null', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.mapEmbedUrl).toBeNull();
  });

  test('edge case: today === ON_REG_DEADLINE, not registered → REGISTRATION_GAP', () => {
    const card = resolveVoterState(user, ON_REG_DEADLINE);
    expect(card.voterState).toBe(VoterState.REGISTRATION_GAP);
  });

  test('edge case: today === ON_REG_DEADLINE, not registered → urgencyDays === 0', () => {
    const card = resolveVoterState(user, ON_REG_DEADLINE);
    expect(card.urgencyDays).toBe(0);
  });
});

describe('resolveVoterState — DEADLINE_LOCKED', () => {
  const user = { state: 'Maharashtra', age: 25, isRegistered: false, preferredLanguage: 'en' };

  test('voterState === DEADLINE_LOCKED', () => {
    const card = resolveVoterState(user, AFTER_REG);
    expect(card.voterState).toBe(VoterState.DEADLINE_LOCKED);
  });

  test('urgencyDays === 0', () => {
    const card = resolveVoterState(user, AFTER_REG);
    expect(card.urgencyDays).toBe(0);
  });

  test('headline contains "deadline"', () => {
    const card = resolveVoterState(user, AFTER_REG);
    expect(card.headline.toLowerCase()).toContain('deadline');
  });

  test('checklist has at least one item mentioning "2026-02-10"', () => {
    const card = resolveVoterState(user, AFTER_REG);
    expect(card.checklist.some((item) => item.includes('2026-02-10'))).toBe(true);
  });

  test('formUrl is not null', () => {
    const card = resolveVoterState(user, AFTER_REG);
    expect(card.formUrl).not.toBeNull();
  });
});

describe('resolveVoterState — READY_TO_VOTE', () => {
  const user = { state: 'Maharashtra', age: 30, isRegistered: true, preferredLanguage: 'en' };

  test('voterState === READY_TO_VOTE', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.voterState).toBe(VoterState.READY_TO_VOTE);
  });

  test('urgencyDays === 73', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.urgencyDays).toBe(73);
  });

  test('headline contains "registered"', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.headline).toContain('registered');
  });

  test('checklist contains item with "electoralsearch"', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.checklist.some((item) => item.includes('electoralsearch'))).toBe(true);
  });

  test('mapEmbedUrl is not null', () => {
    const card = resolveVoterState(user, BEFORE_REG);
    expect(card.mapEmbedUrl).not.toBeNull();
  });
});

describe('resolveVoterState — VOTING_WINDOW_OPEN', () => {
  const user = { state: 'Maharashtra', age: 30, isRegistered: true, preferredLanguage: 'en' };

  test('voterState === VOTING_WINDOW_OPEN', () => {
    const card = resolveVoterState(user, ON_POLLING_DAY);
    expect(card.voterState).toBe(VoterState.VOTING_WINDOW_OPEN);
  });

  test('urgencyDays === 0', () => {
    const card = resolveVoterState(user, ON_POLLING_DAY);
    expect(card.urgencyDays).toBe(0);
  });

  test('headline contains "vote"', () => {
    const card = resolveVoterState(user, ON_POLLING_DAY);
    expect(card.headline.toLowerCase()).toContain('vote');
  });

  test('checklist contains item mentioning "7 AM"', () => {
    const card = resolveVoterState(user, ON_POLLING_DAY);
    expect(card.checklist.some((item) => item.includes('7 AM'))).toBe(true);
  });

  test('mapEmbedUrl is not null', () => {
    const card = resolveVoterState(user, ON_POLLING_DAY);
    expect(card.mapEmbedUrl).not.toBeNull();
  });
});

describe('resolveVoterState — AWAITING_RESULTS', () => {
  const user = { state: 'Maharashtra', age: 30, isRegistered: true, preferredLanguage: 'en' };

  test('voterState === AWAITING_RESULTS', () => {
    const card = resolveVoterState(user, ON_COUNTING_DAY);
    expect(card.voterState).toBe(VoterState.AWAITING_RESULTS);
  });

  test('urgencyDays === 1', () => {
    const card = resolveVoterState(user, ON_COUNTING_DAY);
    expect(card.urgencyDays).toBe(1);
  });

  test('headline contains "count"', () => {
    const card = resolveVoterState(user, ON_COUNTING_DAY);
    expect(card.headline.toLowerCase()).toContain('count');
  });

  test('edge: today: ON_RESULTS_DAY → AWAITING_RESULTS', () => {
    const card = resolveVoterState(user, ON_RESULTS_DAY);
    expect(card.voterState).toBe(VoterState.AWAITING_RESULTS);
  });

  test('edge: today: ON_RESULTS_DAY → urgencyDays === 0', () => {
    const card = resolveVoterState(user, ON_RESULTS_DAY);
    expect(card.urgencyDays).toBe(0);
  });
});

describe('resolveVoterState — POST_ELECTION', () => {
  const user = { state: 'Maharashtra', age: 30, isRegistered: true, preferredLanguage: 'en' };

  test('voterState === POST_ELECTION', () => {
    const card = resolveVoterState(user, AFTER_RESULTS);
    expect(card.voterState).toBe(VoterState.POST_ELECTION);
  });

  test('urgencyDays === 0', () => {
    const card = resolveVoterState(user, AFTER_RESULTS);
    expect(card.urgencyDays).toBe(0);
  });

  test('checklist contains item with "results.eci.gov.in"', () => {
    const card = resolveVoterState(user, AFTER_RESULTS);
    expect(card.checklist.some((item) => item.includes('results.eci.gov.in'))).toBe(true);
  });
});

describe('resolveVoterState — error handling', () => {
  const user = { state: 'XYZ', age: 25, isRegistered: true, preferredLanguage: 'en' };

  test('unknown state "XYZ" → throws error containing "STATE_NOT_FOUND"', () => {
    expect(() => resolveVoterState(user, BEFORE_REG)).toThrow(/STATE_NOT_FOUND/);
  });

  test('unknown state "XYZ" → error message contains "XYZ"', () => {
    expect(() => resolveVoterState(user, BEFORE_REG)).toThrow(/XYZ/);
  });
});

describe('resolveVoterState — all 10 states smoke test', () => {
  Object.keys(ELECTION_DB).forEach((state) => {
    test(`smoke test for ${state}`, () => {
      const user = { state, age: 25, isRegistered: true, preferredLanguage: 'en' };
      const card = resolveVoterState(user, new Date('2026-01-01T00:00:00Z'));
      expect(card).toBeDefined();
      expect(Object.values(VoterState)).toContain(card.voterState);
      expect(typeof card.headline).toBe('string');
      expect(card.headline.length).toBeGreaterThan(0);
      expect(Array.isArray(card.checklist)).toBe(true);
      expect(card.checklist.length).toBeGreaterThan(0);
    });
  });
});

describe('ActionCard shape invariants', () => {
  test('INELIGIBLE card satisfies invariants', () => {
    const user = { state: 'Maharashtra', age: 16, isRegistered: false, preferredLanguage: 'en' };
    const card = resolveVoterState(user, BEFORE_REG);
    validateCard(card);
  });

  test('REGISTRATION_GAP card satisfies invariants', () => {
    const user = { state: 'Maharashtra', age: 25, isRegistered: false, preferredLanguage: 'en' };
    const card = resolveVoterState(user, BEFORE_REG);
    validateCard(card);
  });

  test('READY_TO_VOTE card satisfies invariants', () => {
    const user = { state: 'Maharashtra', age: 25, isRegistered: true, preferredLanguage: 'en' };
    const card = resolveVoterState(user, BEFORE_REG);
    validateCard(card);
  });
});
