import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Header } from '../Header';
import { LanguageProvider } from '../../context/LanguageContext';
import { BrowserRouter } from 'react-router-dom';

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

describe('Header Component', () => {
  it('renders correctly', () => {
    renderWithProviders(<Header />);
    expect(screen.getByText('VoteDisha')).toBeDefined();
    expect(screen.getByText('Civic Assistant')).toBeDefined();
  });

  it('navigates to home when logo is clicked', () => {
    renderWithProviders(<Header />);
    const logoBtn = screen.getByLabelText('VoteDisha home');
    fireEvent.click(logoBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('changes language when selector is used', () => {
    renderWithProviders(<Header />);
    const select = screen.getByLabelText('Select language');
    
    // Default should be English
    expect((select as HTMLSelectElement).value).toBe('en');
    
    // Change to Hindi
    fireEvent.change(select, { target: { value: 'hi' } });
    expect((select as HTMLSelectElement).value).toBe('hi');
  });
});
