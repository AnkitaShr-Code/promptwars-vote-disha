import React, { act } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useLanguage, LanguageProvider } from '../LanguageContext';

describe('useLanguage', () => {
  it('throws when used outside LanguageProvider', () => {
    // Suppress console.error because React logs errors thrown during render
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => renderHook(() => useLanguage())).toThrow(
      'useLanguage must be used within a LanguageProvider'
    );
    
    consoleSpy.mockRestore();
  });

  it('provides language value inside LanguageProvider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    );
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe('en');
    expect(result.current.languageLabel).toBe('English');
  });

  it('updates document.documentElement.lang on language change', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LanguageProvider>{children}</LanguageProvider>
    );
    const { result } = renderHook(() => useLanguage(), { wrapper });
    
    act(() => {
      result.current.setLanguage('hi');
    });
    
    expect(document.documentElement.lang).toBe('hi');
  });
});
