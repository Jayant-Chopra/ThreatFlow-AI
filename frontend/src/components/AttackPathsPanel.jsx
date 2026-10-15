import React from 'react';
import { Zap, Filter, RotateCcw, ShieldCheck } from 'lucide-react';

const SEVERITY_COLORS = {
  CRITICAL: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.16)', border: '#ef4444' },
  HIGH: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.16)', border: '#f59e0b' },
  MEDIUM: { color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.16)', border: '#3b82f6' },
  LOW: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.16)', border: '#10b981' },
};

export function AttackPathsPanel({ attackPaths = [], activePathId, onSelectPath }) {
  const sortedPaths = [...attackPaths].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

  if (!sortedPaths.length) {
    return (
      <div
        style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 10,
          padding: 20,
          textAlign: 'center',
          color: '#34d399',
        }}
      >
        <ShieldCheck size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.8 }} />
        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>No Active Attack Paths</div>
        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 4 }}>
          Taint analysis confirmed 0 exploitable source-to-sink pathways in this scope.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Active Filter Bar */}
      {activePathId && (
        <div
          style={{
            padding: '8px 12px',
            background: 'rgba(6, 182, 212, 0.12)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={13} color="#22d3ee" />
            <span style={{ fontSize: '0.75rem', color: '#22d3ee', fontWeight: 700 }}>
              Filtering Graph on {activePathId}
            </span>
          </div>
          <button
            onClick={() => onSelectPath(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.72rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 6px',
            }}
          >
            <RotateCcw size={11} />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* Path Cards */}
      {sortedPaths.map((path) => {
        const isActive = activePathId === path.id;
        const sevStyle = SEVERITY_COLORS[path.riskLevel] || SEVERITY_COLORS.HIGH;

        return (
          <div
            key={path.id}
            onClick={() => onSelectPath(isActive ? null : path.id)}
            style={{
              background: isActive ? 'rgba(15, 23, 42, 0.95)' : 'rgba(11, 17, 32, 0.75)',
              border: `1px solid ${isActive ? sevStyle.border : 'rgba(255, 255, 255, 0.08)'}`,
              borderRadius: 10,
              padding: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? `0 0 16px ${sevStyle.bg}` : 'none',
            }}
          >
            {/* Header: Badge & Score */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 4,
                    color: sevStyle.color,
                    background: sevStyle.bg,
                    border: `1px solid ${sevStyle.border}44`,
                  }}
                >
                  {path.riskLevel}
                </span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {path.id}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Zap size={13} color="#f59e0b" />
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc' }}>
                  {path.riskScore}/9
                </span>
              </div>
            </div>

            {/* Title */}
            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>
              {path.title || path.vulnerabilityType}
            </div>

            {/* Risk Breakdown */}
            {path.riskMetrics && (
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 10 }}>
                Impact: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{path.riskMetrics.impact}/3</span> • Exposure: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{path.riskMetrics.exposure}/3</span>
              </div>
            )}

            {/* Clickable Step Timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {(path.steps || []).map((step, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: '0.73rem',
                    padding: '3px 6px',
                    borderRadius: 4,
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <span style={{ color: '#64748b', fontSize: '0.65rem', width: 14 }}>{step.stepNumber}.</span>
                  <span className="mono" style={{ color: '#cbd5e1', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {step.label}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase' }}>
                    {step.category}
                  </span>
                </div>
              ))}
            </div>

            {/* Card Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#64748b', paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span>Hop Count: <strong style={{ color: '#cbd5e1' }}>{path.hopCount}</strong></span>
              <span style={{ color: isActive ? '#06b6d4' : '#94a3b8', fontWeight: 600 }}>
                {isActive ? '● Active on Graph' : 'Click to inspect in graph →'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
