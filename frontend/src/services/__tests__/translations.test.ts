import { describe, it, expect } from 'vitest';
import { useTranslation } from '../translations';

describe('useTranslation', () => {
  it('returns key as fallback when translation missing', () => {
    const { t } = useTranslation('en');
    expect(t('nonexistent_key_xyz')).toBe('nonexistent_key_xyz');
  });

  it('returns correct English translation', () => {
    const { t } = useTranslation('en');
    expect(t('checklist_title')).toBe('Your Action Checklist');
    expect(typeof t('checklist_title')).toBe('string');
  });

  it('returns correct Hindi translation', () => {
    const { t } = useTranslation('hi');
    const result = t('checklist_title');
    expect(result).toBe('आपकी चेकलिस्ट');
    expect(typeof result).toBe('string');
  });
});
