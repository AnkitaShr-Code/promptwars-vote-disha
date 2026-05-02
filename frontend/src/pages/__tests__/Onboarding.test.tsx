import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Onboarding } from '../Onboarding';
import { LanguageProvider } from '../../context/LanguageContext';
import { api, VoteDishaError } from '../../services/apiClient';
import { BrowserRouter } from 'react-router-dom';

// Mock the API client
vi.mock('../../services/apiClient', () => ({
  api: {
    resolveState: vi.fn(),
  },
  VoteDishaError: class extends Error {
    constructor(message: string, public code: string) {
      super(message);
    }
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual as any,
    useNavigate: () => mockNavigate,
  };
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <LanguageProvider>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </LanguageProvider>
  );
};

describe('Onboarding Page', () => {
  it('navigates through the steps correctly', async () => {
    renderWithProviders(<Onboarding />);

    // Step 1: State Selection
    expect(screen.getByText(/Step 1 of 3/i)).toBeDefined();
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Maharashtra' } });
    
    const continueBtn = screen.getByText(/continue/i);
    fireEvent.click(continueBtn);

    // Step 2: Age Selection
    expect(screen.getByText(/Step 2 of 3/i)).toBeDefined();
    const ageInput = screen.getByRole('spinbutton');
    fireEvent.change(ageInput, { target: { value: '25' } });
    
    const nextBtn = screen.getByText(/next/i);
    fireEvent.click(nextBtn);

    // Step 3: Registration Status
    expect(screen.getByText(/Step 3 of 3/i)).toBeDefined();
    const yesBtn = screen.getByText(/Yes, I am registered/i);
    fireEvent.click(yesBtn);

    const submitBtn = screen.getByText(/see my guide/i);
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls the API and navigates to result on submit', async () => {
    const mockResponse = { actionCard: { voterState: 'READY_TO_VOTE' }, aiExplanation: 'Test' };
    (api.resolveState as any).mockResolvedValue(mockResponse);

    renderWithProviders(<Onboarding />);

    // Fast forward to step 3
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Maharashtra' } });
    fireEvent.click(screen.getByText(/continue/i));
    
    const ageInput = screen.getByRole('spinbutton');
    fireEvent.change(ageInput, { target: { value: '25' } });
    fireEvent.click(screen.getByText(/next/i));
    
    const yesBtn = screen.getByText(/Yes, I am registered/i);
    fireEvent.click(yesBtn);

    // Submit
    const submitBtn = screen.getByText(/see my guide/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.resolveState).toHaveBeenCalledWith({
        state: 'Maharashtra',
        age: 25,
        isRegistered: true,
        preferredLanguage: 'en',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/result', expect.any(Object));
    });
  });

  it('displays an error message when API fails', async () => {
    (api.resolveState as any).mockRejectedValue(new Error('API Failure'));

    renderWithProviders(<Onboarding />);

    // Fast forward to step 3
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Maharashtra' } });
    fireEvent.click(screen.getByText(/continue/i));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/Yes, I am registered/i));

    // Submit
    fireEvent.click(screen.getByText(/see my guide/i));

    await waitFor(() => {
      expect(screen.getByText(/An unexpected error occurred/i)).toBeDefined();
    });
  });

  it('displays a specific error message for VoteDishaError', async () => {
    (api.resolveState as any).mockRejectedValue(new VoteDishaError('Invalid state', 'INVALID_STATE'));

    renderWithProviders(<Onboarding />);

    // Fast forward to step 3
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Maharashtra' } });
    fireEvent.click(screen.getByText(/continue/i));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });
    fireEvent.click(screen.getByText(/next/i));
    fireEvent.click(screen.getByText(/Yes, I am registered/i));

    // Submit
    fireEvent.click(screen.getByText(/see my guide/i));

    await waitFor(() => {
      expect(screen.getByText(/Invalid state \(INVALID_STATE\)/i)).toBeDefined();
    });
  });

  it('navigates backwards correctly', () => {
    renderWithProviders(<Onboarding />);

    // Go to step 2
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Maharashtra' } });
    fireEvent.click(screen.getByText(/continue/i));
    expect(screen.getByText(/Step 2 of 3/i)).toBeDefined();

    // Go back to step 1
    fireEvent.click(screen.getByText(/back/i));
    expect(screen.getByText(/Step 1 of 3/i)).toBeDefined();
  });

  it('handles "not sure" registration status', async () => {
    (api.resolveState as any).mockResolvedValue({ actionCard: { voterState: 'READY_TO_VOTE' } });
    renderWithProviders(<Onboarding />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Maharashtra' } });
    fireEvent.click(screen.getByText(/continue/i));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });
    fireEvent.click(screen.getByText(/next/i));
    
    // Select unsure
    const unsureBtn = screen.getByText(/I'm not sure/i);
    fireEvent.click(unsureBtn);

    fireEvent.click(screen.getByText(/see my guide/i));

    await waitFor(() => {
      expect(api.resolveState).toHaveBeenCalledWith(expect.objectContaining({
        isRegistered: false, // In code, 'unsure' is treated as false for resolution
      }));
    });
  });

  it('shows Election soon label for states with upcoming polling', () => {
    // Mock today's date to be 30 days before Tamil Nadu polling day
    // Tamil Nadu pollingDay: 2026-04-26
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-27T00:00:00Z'));
    
    renderWithProviders(<Onboarding />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeDefined();
    
    // The option for Tamil Nadu should contain 'Election soon'
    const tnOption = screen.getByText(/Tamil Nadu/i);
    expect(tnOption.textContent).toContain('Election soon');
    
    vi.useRealTimers();
  });

  it('I am not sure button shows note text', async () => {
    renderWithProviders(<Onboarding />);
    
    // Navigate to step 3
    const stateSelect = screen.getByRole('combobox');
    fireEvent.change(stateSelect, { target: { value: 'Maharashtra' } });
    fireEvent.click(screen.getByText(/continue/i));
    
    const ageInput = screen.getByRole('spinbutton');
    fireEvent.change(ageInput, { target: { value: '25' } });
    fireEvent.click(screen.getByText(/next/i));
    
    // Now on step 3 — click I'm not sure
    const notSureButton = screen.getByText(/I'm not sure/i);
    fireEvent.click(notSureButton);
    
    expect(screen.getByText(/We'll help you check your status/i)).toBeDefined();
  });

  it('selects "No" registration status correctly', async () => {
    renderWithProviders(<Onboarding />);
    
    // Navigate to step 3
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Maharashtra' } });
    fireEvent.click(screen.getByText(/continue/i));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '25' } });
    fireEvent.click(screen.getByText(/next/i));
    
    // Select No
    const noBtn = screen.getByText(/No, I'm not registered/i);
    fireEvent.click(noBtn);
    
    expect(noBtn.closest('button')?.style.background).toContain('rgba(79, 70, 229, 0.05)');
  });
});
