import React, { useState } from 'react';
import {
  Globe,
  Code2,
  LogIn,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Copy,
  Terminal,
  Zap,
  Info,
} from 'lucide-react';

const STEP_ICONS = {
  ROUTE: Globe,
  FUNCTION: Code2,
  SOURCE: LogIn,
  VARIABLE: Code2,
  SINK: AlertOctagon,
};

const STEP_COLORS = {
  ROUTE: { border: '#00f2fe', bg: 'rgba(0, 242, 254, 0.1)', text: '#00f2fe' },
  FUNCTION: { border: '#818cf8', bg: 'rgba(99, 102, 241, 0.1)', text: '#818cf8' },
  SOURCE: { border: '#fbbf24', bg: 'rgba(245, 158, 11, 0.1)', text: '#fbbf24' },
  VARIABLE: { border: '#c084fc', bg: 'rgba(139, 92, 246, 0.1)', text: '#c084fc' },
  SINK: { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
};

export function AttackStoryFlow({ attackPaths = [], activePathId, onSelectPath, chokepoints }) {
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const currentPath = attackPaths.find((p) => p.id === activePathId) || attackPaths[0];

  if (!currentPath) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        No attack paths found. Please run a scan.
      </div>
    );
  }

  const steps = currentPath.steps || [];
  const selectedStep = steps[selectedStepIdx] || steps[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 32px' }}>
      {/* Path Selector Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
            Select Vulnerability Scenario
          </span>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {attackPaths.map((path) => {
              const isSelected = path.id === currentPath.id;
              return (
                <button
                  key={path.id}
                  onClick={() => {
                    onSelectPath(path.id);
                    setSelectedStepIdx(0);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: isSelected ? '1px solid #00f2fe' : '1px solid rgba(255,255,255,0.1)',
                    background: isSelected ? 'rgba(0, 242, 254, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                    color: isSelected ? '#00f2fe' : '#94a3b8',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: path.riskLevel === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                    }}
                  />
                  <span>{path.title || path.vulnerabilityType}</span>
                  <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>({path.id})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Risk Badge */}
        <div
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Zap size={18} color="#ef4444" />
          <div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Risk Score</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f87171' }}>
              {currentPath.riskScore}/9 ({currentPath.riskLevel})
            </div>
          </div>
        </div>
      </div>

      {/* Story Summary Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.6) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          padding: 20,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Info size={18} color="#00f2fe" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
            What is happening here? (Easy Explanation)
          </h3>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>
          An outside attacker sends an unauthenticated HTTP request to the public endpoint{' '}
          <strong className="mono" style={{ color: '#00f2fe' }}>{currentPath.route?.method} {currentPath.route?.path}</strong>. 
          The application accepts the untrusted input parameter{' '}
          <strong className="mono" style={{ color: '#fbbf24' }}>{currentPath.source?.expression}</strong> without sanitation, passes it into{' '}
          <strong className="mono" style={{ color: '#818cf8' }}>{currentPath.handler?.name}()</strong>, and directly feeds it into the dangerous sink{' '}
          <strong className="mono" style={{ color: '#f87171' }}>{currentPath.sink?.name}</strong>.
        </p>
      </div>

      {/* Horizontal Visual Step-by-Step Flow */}
      <div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 }}>
          Attack Flow Chain ({steps.length} Steps from Entry to Exploit)
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {steps.map((step, idx) => {
            const isSelected = idx === selectedStepIdx;
            const category = step.category || 'FUNCTION';
            const colors = STEP_COLORS[category] || STEP_COLORS.FUNCTION;
            const IconComp = STEP_ICONS[category] || Code2;

            return (
              <React.Fragment key={idx}>
                <div
                  onClick={() => setSelectedStepIdx(idx)}
                  style={{
                    minWidth: 180,
                    flex: '1 0 180px',
                    padding: 16,
                    borderRadius: 12,
                    background: isSelected ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.7)',
                    border: `2px solid ${isSelected ? colors.border : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isSelected ? `0 0 20px ${colors.border}40` : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: colors.text, textTransform: 'uppercase' }}>
                      Step {step.stepNumber}: {step.category}
                    </span>
                    <IconComp size={15} color={colors.text} />
                  </div>

                  <div className="mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: 4, wordBreak: 'break-all' }}>
                    {step.label}
                  </div>

                  <div className="mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {step.location}
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <ArrowRight size={18} color="#64748b" style={{ flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Inspector Card */}
      {selectedStep && (
        <div
          style={{
            background: 'rgba(13, 19, 35, 0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
              Inspecting Step {selectedStep.stepNumber} • {selectedStep.category}
            </div>
            <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginTop: 2 }}>
              {selectedStep.label}
            </div>
            <div className="mono" style={{ fontSize: '0.8rem', color: '#00f2fe', marginTop: 2 }}>
              📍 Located at: {selectedStep.location}
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: 450 }}>
            {selectedStep.category === 'ROUTE' && 'This is the public door into your server where untrusted web requests enter.'}
            {selectedStep.category === 'FUNCTION' && 'This is the controller logic that executes when the route is triggered.'}
            {selectedStep.category === 'SOURCE' && 'This is the unvalidated user parameter (query/body/param) controlled by the attacker.'}
            {selectedStep.category === 'VARIABLE' && 'This variable holds the tainted user data and carries it through the application flow.'}
            {selectedStep.category === 'SINK' && 'DANGER: This function executes the user input directly into system shells or database!'}
          </div>
        </div>
      )}
    </div>
  );
}
