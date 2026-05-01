import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateCard } from '../StateCard';
import { VoterState } from '@shared/types';
import { LanguageProvider } from '../../context/LanguageContext';

const mockActionCard = {
  voterState: VoterState.READY_TO_VOTE,
  headline: 'You are registered!',
  subtext: 'Get ready to vote on election day.',
  urgencyDays: 10,
  checklist: ['Find your [booth](https://map.com)', 'Bring ID'],
  formUrl: 'https://nvsp.in',
  mapEmbedUrl: 'https://maps.google.com',
};

const mockExplanation = 'Personalized guide for your status.';

describe('StateCard Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the correct headline and explanation', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard} aiExplanation={mockExplanation} />
      </LanguageProvider>
    );

    expect(screen.getByText('You are registered!')).toBeDefined();
    expect(screen.getByText(mockExplanation)).toBeDefined();
  });

  it('renders urgency badge when urgencyDays > 0', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard} aiExplanation={mockExplanation} />
      </LanguageProvider>
    );

    expect(screen.getByText(/10/)).toBeDefined();
    expect(screen.getByText(/DAYS LEFT/i)).toBeDefined();
  });

  it('parses links in checklist items', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard} aiExplanation={mockExplanation} />
      </LanguageProvider>
    );

    const links = screen.getAllByRole('link');
    const checklistLink = links.find(l => l.getAttribute('href') === 'https://map.com');
    expect(checklistLink).toBeDefined();
    expect(checklistLink?.textContent).toContain('booth');
  });

  it('toggles checklist items and saves to localStorage', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard} aiExplanation={mockExplanation} sessionId="test-session" />
      </LanguageProvider>
    );

    const item = screen.getByText(/Bring ID/i);
    const checkbox = item.closest('[role="checkbox"]');
    
    expect(checkbox?.getAttribute('aria-checked')).toBe('false');
    
    fireEvent.click(checkbox!);
    expect(checkbox?.getAttribute('aria-checked')).toBe('true');
    
    const saved = localStorage.getItem('votedisha-checklist-test-session');
    expect(saved).toContain('1'); // Index 1 was clicked
  });

  it('handles keyboard interaction for checklist items', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard} aiExplanation={mockExplanation} />
      </LanguageProvider>
    );

    const checkbox = screen.getAllByRole('checkbox')[1];
    fireEvent.keyDown(checkbox, { key: 'Enter' });
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
    
    fireEvent.keyDown(checkbox, { key: ' ' });
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
  });

  it('handles sharing via clipboard fallback', async () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard} aiExplanation={mockExplanation} />
      </LanguageProvider>
    );

    const shareBtn = screen.getByText(/Share Report/i);
    fireEvent.click(shareBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(await screen.findByText(/Copied!/i)).toBeDefined();
  });

  it('renders action buttons when URLs are provided', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard} aiExplanation={mockExplanation} />
      </LanguageProvider>
    );

    expect(screen.getByText(/Register on NVSP Portal/i)).toBeDefined();
    expect(screen.getByText(/Find My Polling Booth/i)).toBeDefined();
  });

  it('returns null when actionCard is missing', () => {
    const { container } = render(
      <LanguageProvider>
        <StateCard actionCard={null as any} aiExplanation="" />
      </LanguageProvider>
    );
    expect(container.firstChild).toBeNull();
  });
});
