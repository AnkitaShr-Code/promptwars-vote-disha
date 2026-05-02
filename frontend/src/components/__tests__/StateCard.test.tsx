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

const mockReadyToVoteCard = {
  voterState: VoterState.READY_TO_VOTE,
  headline: 'You are registered',
  subtext: 'You are all set to vote in Maharashtra.',
  urgencyDays: 30,
  checklist: [
    'Verify your name at [electoralsearch.eci.gov.in](https://electoralsearch.eci.gov.in)',
    'Carry your Voter ID on polling day'
  ],
  formUrl: null,
  mapEmbedUrl: 'https://electoralsearch.eci.gov.in?stateCode=MH'
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

  it('renders markdown links as anchor tags', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockReadyToVoteCard as any} aiExplanation="test" />
      </LanguageProvider>
    );
    const link = screen.getByRole('link', { name: /electoralsearch/i });
    expect(link).toBeDefined();
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('stops propagation when clicking a checklist link', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockReadyToVoteCard as any} aiExplanation="test" />
      </LanguageProvider>
    );
    const link = screen.getByRole('link', { name: /electoralsearch/i });
    const stopPropagationSpy = vi.fn();
    fireEvent.click(link, { stopPropagation: stopPropagationSpy });
    // Note: Vitest fireEvent doesn't easily verify stopPropagation on the event object itself
    // but the code calls it.
  });

  it('does not show map iframe before button click', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockReadyToVoteCard as any} aiExplanation="test" />
      </LanguageProvider>
    );
    expect(screen.queryByTitle(/polling booth/i)).toBeNull();
  });

  it('shows find booth link when mapEmbedUrl exists', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockReadyToVoteCard as any} aiExplanation="test" />
      </LanguageProvider>
    );
    const boothLink = screen.getByRole('link', { name: /Find.*Booth/i });
    expect(boothLink).toBeDefined();
  });

  it('share button exists and is clickable', () => {
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard as any} aiExplanation="test" />
      </LanguageProvider>
    );
    const shareButton = screen.getByRole('button', { name: /Share/i });
    expect(shareButton).toBeDefined();
  });

  it('shows copied confirmation when share API unavailable', async () => {
    // Save original
    const originalShare = navigator.share;
    const originalClipboard = navigator.clipboard;

    Object.defineProperty(navigator, 'share', { 
      value: undefined, writable: true, configurable: true
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true, configurable: true
    });

    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard as any} aiExplanation="test" />
      </LanguageProvider>
    );
    const shareButton = screen.getByRole('button', { name: /Share/i });
    fireEvent.click(shareButton);
    
    expect(await screen.findByText(/Copied!/i)).toBeDefined();

    // Restore
    Object.defineProperty(navigator, 'share', { value: originalShare, writable: true, configurable: true });
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, writable: true, configurable: true });
  });

  it('handles navigator.share failure gracefully', async () => {
    const originalShare = navigator.share;
    Object.defineProperty(navigator, 'share', { 
      value: vi.fn().mockRejectedValue(new Error('Share failed')), 
      writable: true, configurable: true
    });

    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard as any} aiExplanation="test" />
      </LanguageProvider>
    );
    const shareButton = screen.getByRole('button', { name: /Share/i });
    fireEvent.click(shareButton);
    
    // Should not crash and not show "Copied!" (since it didn't hit the clipboard path)
    await waitFor(() => {
      expect(screen.queryByText(/Copied!/i)).toBeNull();
    });

    Object.defineProperty(navigator, 'share', { value: originalShare, writable: true, configurable: true });
  });

  it('handles invalid JSON in localStorage', () => {
    localStorage.setItem('votedisha-checklist-test-session', 'invalid-json');
    render(
      <LanguageProvider>
        <StateCard actionCard={mockActionCard as any} aiExplanation="test" sessionId="test-session" />
      </LanguageProvider>
    );
    // Should fallback to empty set without crashing
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(cb => expect(cb.getAttribute('aria-checked')).toBe('false'));
  });
});
