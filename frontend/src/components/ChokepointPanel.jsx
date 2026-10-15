import React, { useState } from 'react';
import { Target, ShieldCheck, Copy, Check } from 'lucide-react';

export function ChokepointPanel({ chokepoints }) {
  const [copied, setCopied] = useState(false);
  const primary = chokepoints?.primary;
  const plan = chokepoints?.plan || [];
  const summary = chokepoints?.summary;

  if (!primary) {
    return (
      <div
        style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 10,
          padding: 16,
          textAlign: 'center',
          color: '#34d399',
          fontSize: '0.85rem',
        }}
      >
        <ShieldCheck size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.8 }} />
        <div style={{ fontWeight: 700 }}>Clean Pipeline Verified</div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
          No exploitable chokepoint sinks identified in this codebase.
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    if (primary.recommendation) {
      navigator.clipboard.writeText(primary.recommendation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const impactPercent = summary?.totalPaths
    ? Math.round(((primary.pathsCovered || 1) / summary.totalPaths) * 100)
    : (plan[0]?.cumulativePercent || 33);

  return (
    <div
      style={{
        background: 'rgba(11, 17, 32, 0.85)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Target size={16} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc' }}>
              Master Chokepoint Remediation
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
              Greedy set-cover defense calculation
            </div>
          </div>
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: 4,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#34d399',
          }}
        >
          {impactPercent}% Collapse Impact
        </span>
      </div>

      {/* Target details */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: '#64748b' }}>Target Sink:</span>
          <span className="mono" style={{ color: '#f87171', fontWeight: 700 }}>
            {primary.label} ({primary.category})
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: '#64748b' }}>Location:</span>
          <span className="mono" style={{ color: '#22d3ee', fontSize: '0.72rem' }}>
            {primary.location}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
          <span style={{ color: '#64748b' }}>Defense Leverage:</span>
          <span style={{ color: '#34d399', fontWeight: 700 }}>
            Blocks {primary.pathsCovered || 1} of {summary?.totalPaths || 3} attack paths
          </span>
        </div>
      </div>

      {/* Remediation code block */}
      {primary.recommendation && (
        <div
          style={{
            background: 'rgba(9, 13, 22, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase' }}>
              Remediation Advice
            </span>
            <button
              onClick={handleCopy}
              style={{
                background: 'transparent',
                border: 'none',
                color: copied ? '#34d399' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy Advice'}</span>
            </button>
          </div>
          <div
            className="mono"
            style={{
              padding: '10px 12px',
              fontSize: '0.75rem',
              color: '#cbd5e1',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {primary.recommendation}
          </div>
        </div>
      )}

      {/* Remediation Roadmap */}
      {plan.length > 1 && (
        <div style={{ paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
            Set-Cover Roadmap ({plan.length} Steps to 100% Defense):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {plan.map((step, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem',
                  padding: '4px 8px',
                  borderRadius: 4,
                  background: 'rgba(255, 255, 255, 0.02)',
                }}
              >
                <span style={{ color: '#94a3b8' }}>
                  Step {step.step}: Fix <code className="mono" style={{ color: '#f87171' }}>{step.nodeId}</code>
                </span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>
                  {step.cumulativePercent}% neutralised
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
