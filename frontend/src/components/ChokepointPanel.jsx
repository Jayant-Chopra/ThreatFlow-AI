import React, { useState } from 'react';
import { Target, CheckCircle2, ShieldCheck, Copy, Check } from 'lucide-react';

export function ChokepointPanel({ chokepoints }) {
  const [copied, setCopied] = useState(false);
  const primary = chokepoints?.primary;
  const plan = chokepoints?.plan || [];
  const summary = chokepoints?.summary;

  if (!primary) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        No chokepoints detected for this scan.
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

  return (
    <div className="chokepoint-box">
      <div className="chokepoint-title">
        <Target size={18} />
        <span>Primary Chokepoint Remediation</span>
      </div>

      <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 12 }}>
        Highest leverage defensive barrier computed via greedy set cover.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <span style={{ color: '#64748b' }}>Target Component:</span>
          <span className="mono" style={{ color: '#f87171', fontWeight: 700 }}>
            {primary.label} ({primary.category})
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <span style={{ color: '#64748b' }}>Code Location:</span>
          <span className="mono" style={{ color: '#e2e8f0', fontSize: '0.75rem' }}>
            {primary.location}
          </span>
        </div>

        {summary && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span style={{ color: '#64748b' }}>Paths Neutralized:</span>
            <span style={{ color: '#34d399', fontWeight: 700 }}>
              {primary.pathsCovered} of {summary.totalPaths} paths ({summary.fixesToBlockAllPaths} fix total)
            </span>
          </div>
        )}
      </div>

      {primary.recommendation && (
        <div className="chokepoint-recommendation">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontWeight: 700, color: '#f87171', fontSize: '0.75rem' }}>
              RECOMMENDED CODE FIX
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
              }}
              title="Copy recommendation"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          {primary.recommendation}
        </div>
      )}

      {plan.length > 1 && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
            REMEDIATION ROADMAP ({plan.length} STEPS):
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {plan.map((step, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: '0.73rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#94a3b8',
                }}
              >
                <span>Step {step.step}: Fix node <code className="mono">{step.nodeId}</code></span>
                <span style={{ color: '#34d399' }}>{step.cumulativePercent}% blocked</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
