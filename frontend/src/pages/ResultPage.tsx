import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ApiResponse, ActionCard } from '../../../shared/types';
import { StateCard } from '../components/StateCard';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/apiClient';
import { useTranslation } from '../services/translations';

export function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  const headingRef = useRef<HTMLHeadingElement>(null);

  // ADD this useEffect after the existing ones:
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // UPDATE the h1:
  <h1
    ref={headingRef}
    tabIndex={-1}
    style={{
      fontSize: '2.25rem',
      marginBottom: '0.5rem',
      outline: 'none'  // hide focus ring for programmatic focus
    }}
  >
    {t('voter_guide_title')}
  </h1>

  // We use a ref to store the "raw" response from the server to prevent
  // losing the English source of truth during re-renders or language toggles.
  const sourceResponse = useRef<ApiResponse | null>(
    (location.state?.apiResponse as ApiResponse) || null
  );

  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(sourceResponse.current);
  const [isTranslating, setIsTranslating] = useState(false);

  // Initial redirect if no data
  useEffect(() => {
    if (!sourceResponse.current) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Handle language changes and dynamic translation
  useEffect(() => {
    const originalData = sourceResponse.current;
    if (!originalData) return;

    const handleTranslation = async () => {
      // 1. If switching to English, restore from original server-provided source
      if (language === 'en') {
        setApiResponse((prev) =>
          prev ? { ...prev, actionCard: originalData.actionCard, aiExplanation: originalData.aiExplanation } : null
        );
        return;
      }

      // 2. Optimization: If the current card already matches the language (demo mode prefix check)
      // we could skip, but for now we re-fetch to ensure consistency.

      setIsTranslating(true);
      try {
        const [translatedCard, translatedExplanation] = await Promise.all([
          api.translateCard(originalData.actionCard, language),
          api.translateText(originalData.aiExplanation, language),
        ]);

        setApiResponse((prev) =>
          prev
            ? {
                ...prev,
                actionCard: translatedCard,
                aiExplanation: translatedExplanation,
              }
            : null
        );
      } catch {
        // Silently keep current content on failure
      } finally {
        setIsTranslating(false);
      }
    };

    handleTranslation();
  }, [language]); // Only re-run when language changes

  if (!apiResponse) return null;

  return (
    <div
      id="main-content"
      role="main"
      className="animate-fade-in"
      style={{
        maxWidth: '640px',
        margin: '3rem auto',
        padding: '0 1.5rem',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>{t('voter_guide_title')}</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '1.125rem' }}>
          {t('result_subtitle')}
        </p>
      </div>

      {isTranslating && (
        <div
          aria-live="polite"
          aria-busy="true"
          className="glass"
          style={{
            color: 'var(--color-primary)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontSize: '0.9rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            className="spinner"
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid var(--color-primary)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
          {t('analyzing')}
        </div>
      )}

      <StateCard
        key={`${language}_${apiResponse.sessionId}`}
        actionCard={apiResponse.actionCard}
        aiExplanation={apiResponse.aiExplanation}
        sessionId={apiResponse.sessionId}
      />

      <div style={{ textAlign: 'center', marginTop: '3rem', paddingBottom: '4rem' }}>
        <button
          onClick={() => navigate('/')}
          aria-label="Go back to start"
          style={{
            background: 'white',
            border: '1.5px solid var(--color-border)',
            padding: '0.75rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontWeight: '600',
            fontSize: '0.95rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          ← {t('back')}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
