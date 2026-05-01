import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StateCard } from '../StateCard';
import { VoterState } from '@shared/types';
import { LanguageProvider } from '../../context/LanguageContext';

const mockActionCard = {
  voterState: VoterState.READY_TO_VOTE,
  headline: 'You are registered!',
  subtext: 'Get ready to vote on election day.',
  urgencyDays: 10,
  checklist: ['Find your booth', 'Bring ID'],
  formUrl: null,
  mapEmbedUrl: 'https://maps.google.com',
};

const mockExplanation = 'Personalized guide for your status.';

describe('StateCard Component', () => {
  it('renders the correct headline and explanation', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard} aiExplanation={mockExplanation} />
      </LanguageProvider>
    );

    expect(screen.getByText('You are registered!')).toBeDefined();
    expect(screen.getByText(mockExplanation)).toBeDefined();
  });

  it('displays the correct number of checklist items', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard} aiExplanation={mockExplanation} />
      </LanguageProvider>
    );

    expect(screen.getByText('Find your booth')).toBeDefined();
    expect(screen.getByText('Bring ID')).toBeDefined();
  });

  it('renders urgency badge when urgencyDays > 0', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard} aiExplanation={mockExplanation} />
      </LanguageProvider>
    );

    // Using a regex for partial match because of potential whitespace/wrapping
    expect(screen.getByText(/10/)).toBeDefined();
    expect(screen.getByText(/DAYS LEFT/)).toBeDefined();
  });
});
