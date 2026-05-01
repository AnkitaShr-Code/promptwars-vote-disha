import React, { useState, useEffect } from 'react';
import { ActionCard, VoterState } from '../../../shared/types';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../services/translations';

interface StateCardProps {
  actionCard: ActionCard;
  aiExplanation: string;
  sessionId?: string;
}

function parseLinks(text: string): React.ReactNode[] {
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const linkText = match[1];
    const linkUrl = match[2];
    parts.push(
      <a
        key={match.index}
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${linkText} (opens in new tab)`}
        onClick={(e) => e.stopPropagation()}
        style={{
          color: 'var(--color-primary)',
          textDecoration: 'underline',
          fontWeight: '600',
          wordBreak: 'break-all',
        }}
      >
        {linkText}
        <span aria-hidden="true"> ↗</span>
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Maps VoterState to visual styles and icons.
 */
const STATUS_STYLES: Record<VoterState, { color: string; bg: string; icon: string; translationKey: string }> = {
  [VoterState.REGISTRATION_GAP]: {
    color: '#f59e0b',
    bg: '#fffbeb',
    icon: '📝',
    translationKey: 'action_required',
  },
  [VoterState.FUTURE_VOTER]: {
    color: '#6366f1',
    bg: '#eef2ff',
    icon: '⏳',
    translationKey: 'plan_ahead',
  },
  [VoterState.READY_TO_VOTE]: {
    color: '#10b981',
    bg: '#ecfdf5',
    icon: '✅',
    translationKey: 'all_set',
  },
  [VoterState.VOTING_WINDOW_OPEN]: {
    color: '#10b981',
    bg: '#ecfdf5',
    icon: '🗳️',
    translationKey: 'vote_today',
  },
  [VoterState.DEADLINE_LOCKED]: {
    color: '#ef4444',
    bg: '#fef2f2',
    icon: '🚫',
    translationKey: 'deadline_passed',
  },
  [VoterState.INELIGIBLE]: {
    color: '#64748b',
    bg: '#f8fafc',
    icon: 'ℹ️',
    translationKey: 'not_eligible',
  },
  [VoterState.AWAITING_RESULTS]: {
    color: '#3b82f6',
    bg: '#eff6ff',
    icon: '📊',
    translationKey: 'results_pending',
  },
  [VoterState.POST_ELECTION]: {
    color: '#64748b',
    bg: '#f8fafc',
    icon: '🏁',
    translationKey: 'election_complete',
  },
};

export function StateCard({ actionCard, aiExplanation, sessionId }: StateCardProps) {
  const { language } = useLanguage();
  const { t } = useTranslation(language);

  if (!actionCard) return null;

  const style = STATUS_STYLES[actionCard.voterState];

  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const storageKey = `votedisha-checklist-${sessionId || actionCard.voterState}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setCheckedItems(new Set(JSON.parse(saved)));
      } catch {
        setCheckedItems(new Set());
      }
    } else {
      setCheckedItems(new Set());
    }
  }, [storageKey]);

  const toggleItem = (index: number) => {
    const next = new Set(checkedItems);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setCheckedItems(next);
    localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
  };

  const [showCopied, setShowCopied] = useState(false);

  const handleShare = async () => {
    const shareText = `VoteDisha: ${actionCard.headline}\n${actionCard.subtext}\nCheck yours at votedisha.in`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'VoteDisha', text: shareText });
      } catch (e) { }
    } else {
      await navigator.clipboard.writeText(shareText);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  return (
    <article
      className="animate-fade-in glass"
      aria-label={`${t(style.translationKey)}: ${actionCard.headline}`}
      style={{
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-xl)',
        marginBottom: '2rem',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          background: style.bg,
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>{style.icon}</span>
          <span
            style={{
              color: style.color,
              fontWeight: '700',
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {t(style.translationKey)}
          </span>
        </div>
        {actionCard.urgencyDays > 0 && (
          <div
            style={{
              background: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '100px',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: style.color,
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
          >
            {actionCard.urgencyDays} {t('days_left')}
          </div>
        )}
      </div>

      <div style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', lineHeight: 1.2, marginBottom: '1.25rem' }}>
          {actionCard.headline}
        </h2>

        {/* AI Voice Section */}
        <div style={{ marginBottom: '2rem', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              background: style.color,
              borderRadius: '4px',
            }}
          />
          <blockquote
            style={{
              padding: '0.5rem 0 0.5rem 1.5rem',
              color: 'var(--color-text)',
              fontSize: '1.125rem',
              fontWeight: '500',
              lineHeight: 1.5,
            }}
          >
            {aiExplanation}
          </blockquote>
          <p
            style={{
              marginLeft: '1.5rem',
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
            }}
          >
            — {t('votedisha_assistant')}
          </p>
        </div>

        {/* Checklist Section */}
        <div
          style={{
            background: 'rgba(248, 250, 252, 0.5)',
            borderRadius: 'var(--radius-md)',
            padding: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <h3
            style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              letterSpacing: '0.02em',
            }}
          >
            {t('checklist_title')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {actionCard.checklist.map((item, idx) => {
              const isChecked = checkedItems.has(idx);
              return (
                <div
                  key={idx}
                  role="checkbox"
                  aria-checked={isChecked}
                  tabIndex={0}
                  onClick={() => toggleItem(idx)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? toggleItem(idx) : null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    borderRadius: 'var(--radius-sm)',
                    background: isChecked ? 'rgba(255,255,255,0.8)' : 'white',
                    boxShadow: isChecked ? 'none' : 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '6px',
                      border: '2px solid',
                      borderColor: isChecked ? style.color : '#e2e8f0',
                      background: isChecked ? style.color : 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {isChecked && (
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '1rem',
                      fontWeight: isChecked ? '500' : '500',
                      color: isChecked ? 'var(--color-text-muted)' : 'var(--color-text)',
                      textDecoration: isChecked ? 'line-through' : 'none',
                    }}
                  >
                    {parseLinks(item)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {actionCard.formUrl && (
            <a
              href={actionCard.formUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '1.125rem',
                background: 'var(--color-primary)',
                color: 'white',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              }}
            >
              🚀 {t('register_nvsp')} ↗
            </a>
          )}

          {actionCard.mapEmbedUrl && (
            <a
              href={actionCard.mapEmbedUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '1.125rem',
                background: 'white',
                color: 'var(--color-text)',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                textDecoration: 'none',
                border: '1.5px solid var(--color-border)',
              }}
            >
              📍 {t('find_booth')} ↗
            </a>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <button
              onClick={handleShare}
              style={{
                flex: 1,
                padding: '1rem',
                background: '#f1f5f9',
                color: 'var(--color-text)',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                fontSize: '0.9rem',
              }}
            >
              📤 {t('share_report')}
            </button>
            {showCopied && (
              <span
                className="animate-fade-in"
                style={{ fontSize: '0.875rem', color: 'var(--color-success)', fontWeight: '600' }}
              >
                {t('copied')}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
