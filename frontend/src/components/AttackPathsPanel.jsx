import React from 'react';
import { GitBranch, ChevronRight, ShieldAlert, AlertTriangle, Info, Zap } from 'lucide-react';

const SEVERITY_STYLES = {
  CRITICAL: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' },
  HIGH: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' },
  MEDIUM: { color: '#60a5fa', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)' },
  LOW: { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' },
};

export function AttackPathsPanel({ attackPaths = [], activePathId, onSelectPath }) {
  if (!attackPaths.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
        <p style={{ fontSize: '0.85rem' }}>No active attack paths identified.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {activePathId && (
        <div style={{ padding: '8px 16px', background: 'rgba(0, 242, 254, 0.08)', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#00f2fe', fontWeight: 600 }}>Filtering Graph on {activePathId}</span>
          <button
            onClick={() => onSelectPath(null)}
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Clear Filter
          </button>
        </div>
      )}

      {attackPaths.map((path) => {
        const isActive = activePathId === path.id;
        const sevStyle = SEVERITY_STYLES[path.riskLevel] || SEVERITY_STYLES.HIGH;

        return (
          <div
            key={path.id}
            className={`path-card ${isActive ? 'active-path' : ''}`}
            onClick={() => onSelectPath(isActive ? null : path.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <span
                  className="path-badge"
                  style={{
                    color: sevStyle.color,
                    background: sevStyle.bg,
                    border: `1px solid ${sevStyle.border}`,
                    marginRight: 6,
                  }}
                >
                  {path.riskLevel}
                </span>
                <span className="mono" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {path.id}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f1f5f9', fontSize: '0.8rem', fontWeight: 700 }}>
                <Zap size={13} color="#f59e0b" />
                <span>{path.riskScore}/9</span>
              </div>
            </div>

            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
              {path.title || path.vulnerabilityType}
            </h4>

            {path.riskMetrics && (
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 8 }}>
                Impact: {path.riskMetrics.impact} × Exposure: {path.riskMetrics.exposure}
              </div>
            )}

            {/* Breadcrumb Steps */}
            <div className="path-steps-container">
              {(path.steps || []).map((step, idx) => (
                <div key={idx} className="path-step-item">
                  <span style={{ fontSize: '0.65rem', color: '#64748b', width: 14 }}>{step.stepNumber}.</span>
                  <span className="path-step-label mono">{step.label}</span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: 'auto' }}>
                    {step.category}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
              <span>Hop Count: {path.hopCount}</span>
              <span style={{ color: isActive ? '#00f2fe' : '#94a3b8' }}>
                {isActive ? '● Graph Filter Active' : 'Click to inspect in graph →'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
