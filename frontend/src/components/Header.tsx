import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage, LANGUAGE_LABELS, SupportedLanguage } from '../context/LanguageContext';

export function Header() {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();

  return (
    <header
      role="banner"
      className="glass"
      style={{
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 5%',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Logo Section */}
      <button
        onClick={() => navigate('/')}
        aria-label="VoteDisha home"
        style={{
          background: 'none',
          gap: '0.75rem',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.25rem',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
          }}
        >
          V
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--color-text)',
              lineHeight: 1,
            }}
          >
            VoteDisha
          </span>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--color-text-muted)',
              fontWeight: '500',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            Civic Assistant
          </span>
        </div>
      </button>

      {/* Actions Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <label htmlFor="language-selector" className="sr-only">
            Select language
          </label>
          <select
            id="language-selector"
            value={language}
            onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
            style={{
              padding: '0.625rem 2.5rem 0.625rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'white',
              fontSize: '0.9rem',
              fontWeight: '500',
              appearance: 'none',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          <div
            style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
            }}
          >
            ▼
          </div>
        </div>
      </div>
    </header>
  );
}
