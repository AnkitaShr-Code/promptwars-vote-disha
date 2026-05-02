import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ELECTION_DB } from '../../../shared/electionDb';
import { api, VoteDishaError } from '../services/apiClient';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../services/translations';

export function Onboarding() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedState, setSelectedState] = useState('');
  const [age, setAge] = useState('');
  const [isRegistered, setIsRegistered] = useState<boolean | null | 'unsure'>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const MS_IN_90_DAYS = 90 * 24 * 60 * 60 * 1000;

  const handleNext = () => {
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  };

  const handleSubmit = async () => {
    if (!selectedState || !age || isRegistered === null) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.resolveState({
        state: selectedState,
        age: parseInt(age, 10),
        isRegistered: isRegistered === true,
        preferredLanguage: language,
      });
      navigate('/result', { state: { apiResponse: response } });
    } catch (err: unknown) {
      if (err instanceof VoteDishaError) {
        setError(`${err.message} (${err.code})`);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setIsLoading(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <div
      className="animate-fade-in"
      style={{
        maxWidth: '540px',
        margin: '4rem auto',
        padding: '0 1.5rem',
      }}
    >
      <div
        className="glass"
        style={{
          borderRadius: 'var(--radius-lg)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Progress Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '6px',
            background: 'rgba(79, 70, 229, 0.1)',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'var(--color-primary)',
              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>

        <div style={{ marginBottom: '2.5rem' }}>
          <p
            aria-live="polite"
            style={{
              color: 'var(--color-primary)',
              fontWeight: '700',
              fontSize: '0.875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}
          >
            {t('step')} {step} {t('of')} 3
          </p>
          <h2 id="step-heading" style={{ fontSize: '1.875rem', lineHeight: 1.2 }}>
            {step === 1 && t('where_vote')}
            {step === 2 && t('tell_age')}
            {step === 3 && t('reg_status')}
          </h2>
        </div>

        {step === 1 && (
          <div role="group" aria-labelledby="step-heading">
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              {t('state_prompt')}
            </p>
            <div style={{ marginBottom: '2.5rem' }}>
              <label htmlFor="state-select" className="sr-only">
                {t('where_vote')}
              </label>
              <select
                id="state-select"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  background: 'white',
                  fontSize: '1rem',
                  fontWeight: '500',
                }}
              >
                <option value="">{t('choose_state')}</option>
                {Object.entries(ELECTION_DB).map(([stateName, record]) => {
                  const pollingDate = new Date(record.pollingDay + 'T00:00:00Z');
                  const diff = pollingDate.getTime() - today.getTime();
                  const isSoon = diff > 0 && diff <= MS_IN_90_DAYS;
                  return (
                    <option key={stateName} value={stateName}>
                      {stateName}
                      {isSoon ? ` — 🗳️ ${t('election_soon')}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              disabled={!selectedState}
              onClick={handleNext}
              style={{
                width: '100%',
                padding: '1.125rem',
                background: selectedState ? 'var(--color-primary)' : '#e2e8f0',
                color: selectedState ? 'white' : '#94a3b8',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                fontSize: '1rem',
                boxShadow: selectedState ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
              }}
            >
              {t('continue')}
            </button>
          </div>
        )}

        {step === 2 && (
          <div role="group" aria-labelledby="step-heading">
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              {t('age_prompt')}
            </p>
            <div style={{ marginBottom: '2.5rem' }}>
              <label htmlFor="age-input" className="sr-only">
                {t('tell_age')}
              </label>
              <input
                id="age-input"
                type="number"
                placeholder={t('enter_age')}
                min="14"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--color-border)',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '1.125rem',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '600',
                }}
              >
                {t('back')}
              </button>
              <button
                disabled={!age || parseInt(age, 10) <= 0}
                onClick={handleNext}
                style={{
                  flex: 2,
                  padding: '1.125rem',
                  background: age && parseInt(age, 10) > 0 ? 'var(--color-primary)' : '#e2e8f0',
                  color: age && parseInt(age, 10) > 0 ? 'white' : '#94a3b8',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '600',
                  boxShadow:
                    age && parseInt(age, 10) > 0 ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
                }}
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div role="group" aria-labelledby="step-heading">
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              {t('reg_prompt')}
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginBottom: '2.5rem',
              }}
            >
              <button
                onClick={() => setIsRegistered(true)}
                style={{
                  padding: '1.25rem',
                  textAlign: 'left',
                  background: isRegistered === true ? 'rgba(79, 70, 229, 0.05)' : 'white',
                  border: `2px solid ${isRegistered === true ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '2px solid var(--color-border)',
                      background: isRegistered === true ? 'var(--color-primary)' : 'white',
                      borderColor: isRegistered === true ? 'var(--color-primary)' : 'var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isRegistered === true && <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }} />}
                  </div>
                  <span style={{ fontWeight: '600', color: isRegistered === true ? 'var(--color-primary)' : 'var(--color-text)' }}>
                    {t('reg_yes')}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setIsRegistered(false)}
                style={{
                  padding: '1.25rem',
                  textAlign: 'left',
                  background: isRegistered === false ? 'rgba(79, 70, 229, 0.05)' : 'white',
                  border: `2px solid ${isRegistered === false ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '2px solid var(--color-border)',
                      background: isRegistered === false ? 'var(--color-primary)' : 'white',
                      borderColor: isRegistered === false ? 'var(--color-primary)' : 'var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isRegistered === false && <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }} />}
                  </div>
                  <span style={{ fontWeight: '600', color: isRegistered === false ? 'var(--color-primary)' : 'var(--color-text)' }}>
                    {t('reg_no')}
                  </span>
                </div>
              </button>

              <button
                onClick={() => setIsRegistered('unsure')}
                style={{
                  padding: '1.25rem',
                  textAlign: 'left',
                  background: isRegistered === 'unsure' ? 'rgba(79, 70, 229, 0.05)' : 'white',
                  border: `2px solid ${isRegistered === 'unsure' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '2px solid var(--color-border)',
                      background: isRegistered === 'unsure' ? 'var(--color-primary)' : 'white',
                      borderColor: isRegistered === 'unsure' ? 'var(--color-primary)' : 'var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isRegistered === 'unsure' && <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }} />}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '600', color: isRegistered === 'unsure' ? 'var(--color-primary)' : 'var(--color-text)' }}>
                      {t('reg_unsure')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {t('reg_unsure_sub')}
                    </span>
                  </div>
                </div>
              </button>
            </div>

            {error && (
              <div
                aria-live="assertive"
                style={{
                  background: '#fef2f2',
                  color: 'var(--color-danger)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textAlign: 'center',
                  border: '1px solid rgba(239, 68, 68, 0.1)',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleBack}
                style={{
                  flex: 1,
                  padding: '1.125rem',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '600',
                }}
              >
                {t('back')}
              </button>
              <button
                disabled={isRegistered === null || isLoading}
                onClick={handleSubmit}
                style={{
                  flex: 2,
                  padding: '1.125rem',
                  background: isRegistered !== null && !isLoading ? 'var(--color-primary)' : '#e2e8f0',
                  color: isRegistered !== null && !isLoading ? 'white' : '#94a3b8',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: '600',
                  boxShadow: isRegistered !== null && !isLoading ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
                }}
              >
                {isLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                    {t('analyzing')}
                  </div>
                ) : (
                  t('see_guide')
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
