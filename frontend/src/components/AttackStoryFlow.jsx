import React, { useState } from 'react';
import {
  Globe, Code2, LogIn, AlertOctagon, ArrowRight, Zap, Shield, ShieldOff, Database, Terminal, Info, CheckCircle
} from 'lucide-react';

const STEP_ICONS = { ROUTE: Globe, FUNCTION: Code2, SOURCE: LogIn, VARIABLE: Code2, SINK: AlertOctagon };
const STEP_COLORS = {
  ROUTE:    { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)',  text: '#22d3ee', label: 'Entry Point' },
  FUNCTION: { border: '#818cf8', bg: 'rgba(99, 102, 241, 0.12)', text: '#a5b4fc', label: 'Controller' },
  SOURCE:   { border: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', text: '#fcd34d', label: 'Taint Source' },
  VARIABLE: { border: '#c084fc', bg: 'rgba(139, 92, 246, 0.12)', text: '#d8b4fe', label: 'Data Flow' },
  SINK:     { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)',  text: '#fca5a5', label: '⚠ Dangerous Sink' },
};

const VULN_EXPLAIN = {
  SQL_INJECTION: {
    icon: Database,
    color: '#fbbf24',
    simple: 'User input goes directly into a database query — attacker can steal or delete all data.',
    impact: 'Full database access, user data leak, authentication bypass.',
  },
  COMMAND_INJECTION: {
    icon: Terminal,
    color: '#f87171',
    simple: 'User input is passed into a shell command — attacker can run any command on your server.',
    impact: 'Complete server takeover, data destruction, backdoor installation.',
  },
  CODE_EXECUTION: {
    icon: AlertOctagon,
    color: '#c084fc',
    simple: 'User input goes into eval() — attacker can run any JavaScript code on your server.',
    impact: 'Arbitrary code execution, full server compromise.',
  },
};

export function AttackStoryFlow({ attackPaths = [], activePathId, onSelectPath, chokepoints }) {
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const currentPath = attackPaths.find((p) => p.id === activePathId) || attackPaths[0];

  if (!currentPath) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
        <Shield size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
        <p>No scan data yet. Click "Run Scan" to begin.</p>
      </div>
    );
  }

  const steps = currentPath.steps || [];
  const selectedStep = steps[selectedStepIdx];
  const vulnType = (currentPath.vulnerabilityType || '').replace('POTENTIAL_', '');
  const vulnInfo = VULN_EXPLAIN[vulnType] || VULN_EXPLAIN.SQL_INJECTION;
  const VulnIcon = vulnInfo.icon;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Scenario Selector ── */}
      <div style={{ padding: '20px 28px 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Choose a vulnerability scenario to investigate:
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 16 }}>
          {attackPaths.map((path) => {
            const isSelected = path.id === currentPath.id;
            const dotColor = path.riskScore >= 9 ? '#ef4444' : path.riskScore >= 6 ? '#f59e0b' : '#10b981';
            return (
              <button
                key={path.id}
                onClick={() => { onSelectPath(path.id); setSelectedStepIdx(0); }}
                style={{
                  padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s ease',
                  border: isSelected ? `1px solid ${dotColor}` : '1px solid rgba(255,255,255,0.1)',
                  background: isSelected ? `rgba(${path.riskScore >= 9 ? '239,68,68' : path.riskScore >= 6 ? '245,158,11' : '16,185,129'}, 0.12)` : 'rgba(15, 23, 42, 0.6)',
                  color: isSelected ? '#f8fafc' : '#94a3b8',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                {path.title || path.vulnerabilityType}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content: 2 columns ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 340px', minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT: Story + Steps */}
        <div style={{ overflowY: 'auto', padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* What is Happening */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14, padding: '18px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Info size={16} color="#06b6d4" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>What is actually happening?</span>
              <span style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontWeight: 700 }}>
                {currentPath.riskLevel} — {currentPath.riskScore}/9
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 }}>
              An attacker sends a request to{' '}
              <code style={{ color: '#22d3ee', background: 'rgba(6,182,212,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                {currentPath.route?.method} {currentPath.route?.path}
              </code>.{' '}
              The app takes user-supplied value{' '}
              <code style={{ color: '#fcd34d', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                {currentPath.source?.expression}
              </code>{' '}
              without any validation and passes it directly to{' '}
              <code style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                {currentPath.sink?.name}
              </code>
              — which executes it.
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: `rgba(${vulnInfo.color === '#f87171' ? '239,68,68' : '245,158,11'}, 0.08)`, borderRadius: 8, padding: '10px 14px', border: `1px solid ${vulnInfo.color}22` }}>
              <VulnIcon size={18} color={vulnInfo.color} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 700, color: vulnInfo.color, fontSize: '0.82rem', marginBottom: 4 }}>Real-world impact:</div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{vulnInfo.impact}</div>
              </div>
            </div>
          </div>

          {/* Step Chain — scroll horizontally if needed, but no clip */}
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Attack chain — {steps.length} steps from entry to exploit:
            </p>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
              {steps.map((step, idx) => {
                const isSelected = idx === selectedStepIdx;
                const cat = step.category || 'FUNCTION';
                const c = STEP_COLORS[cat] || STEP_COLORS.FUNCTION;
                const Icon = STEP_ICONS[cat] || Code2;
                return (
                  <React.Fragment key={idx}>
                    <div
                      onClick={() => setSelectedStepIdx(idx)}
                      style={{
                        minWidth: 160, flex: '0 0 auto',
                        padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                        background: isSelected ? c.bg : 'rgba(15, 23, 42, 0.7)',
                        border: `2px solid ${isSelected ? c.border : 'rgba(255,255,255,0.06)'}`,
                        boxShadow: isSelected ? `0 0 18px ${c.border}40` : 'none',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {c.label}
                        </span>
                        <Icon size={13} color={c.text} />
                      </div>
                      <div className="mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', wordBreak: 'break-all', marginBottom: 4 }}>
                        {step.label}
                      </div>
                      <div className="mono" style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        {step.location}
                      </div>
                    </div>
                    {idx < steps.length - 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', flexShrink: 0 }}>
                        <ArrowRight size={16} color="#475569" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Step Inspector — fills leftover space, no empty gap */}
          {selectedStep && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '16px 20px', flex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Step {selectedStep.stepNumber} Inspector
                </span>
                <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                  {selectedStep.category}
                </span>
              </div>
              <div className="mono" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                {selectedStep.label}
              </div>
              <div className="mono" style={{ fontSize: '0.82rem', color: '#22d3ee', marginBottom: 12 }}>
                📍 {selectedStep.location}
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.55 }}>
                {selectedStep.category === 'ROUTE' && 'This is the public API endpoint exposed to the internet. Any unauthenticated user can call this.'}
                {selectedStep.category === 'FUNCTION' && 'This controller function handles the incoming request and processes the user data.'}
                {selectedStep.category === 'SOURCE' && '🚨 This is the attack entry point — untrusted user input that the attacker controls completely.'}
                {selectedStep.category === 'VARIABLE' && 'This variable carries the tainted user data through the application without sanitization.'}
                {selectedStep.category === 'SINK' && '🔥 CRITICAL: This function receives the attacker-controlled data and executes it. This is where the exploit lands.'}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Risk Summary Panel — replaces the blank space */}
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.07)', overflowY: 'auto', padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
            Risk Assessment
          </p>

          {/* Risk Score Breakdown */}
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Zap size={16} color="#ef4444" />
              <span style={{ fontWeight: 700, color: '#f87171', fontSize: '0.88rem' }}>
                Score: {currentPath.riskScore}/9 — {currentPath.riskLevel}
              </span>
            </div>
            {currentPath.riskMetrics && (
              <>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Impact</span>
                    <span style={{ color: '#f8fafc', fontWeight: 700 }}>{currentPath.riskMetrics.impact}/3</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                    <div style={{ height: 6, width: `${(currentPath.riskMetrics.impact / 3) * 100}%`, background: '#ef4444', borderRadius: 3 }} />
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>{currentPath.riskMetrics.impactReason}</p>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                    <span style={{ color: '#94a3b8' }}>Exposure</span>
                    <span style={{ color: '#f8fafc', fontWeight: 700 }}>{currentPath.riskMetrics.exposure}/3</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                    <div style={{ height: 6, width: `${(currentPath.riskMetrics.exposure / 3) * 100}%`, background: '#f59e0b', borderRadius: 3 }} />
                  </div>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 4 }}>{currentPath.riskMetrics.exposureReason}</p>
                </div>
              </>
            )}
          </div>

          {/* Chokepoint Fix */}
          {chokepoints?.primary && (
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <CheckCircle size={15} color="#10b981" />
                <span style={{ fontWeight: 700, color: '#34d399', fontSize: '0.82rem' }}>Primary Chokepoint Fix</span>
              </div>
              <div className="mono" style={{ fontSize: '0.8rem', color: '#f87171', fontWeight: 700, marginBottom: 6 }}>
                {chokepoints.primary.label} ({chokepoints.primary.category})
              </div>
              <div className="mono" style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 8 }}>
                {chokepoints.primary.location}
              </div>
              <p style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.5, borderLeft: '2px solid #10b981', paddingLeft: 8 }}>
                {chokepoints.primary.recommendation}
              </p>
            </div>
          )}

          {/* All Paths Summary */}
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, flex: 1 }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              All Vulnerabilities
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attackPaths.map((p) => {
                const isActive = p.id === currentPath.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => { onSelectPath(p.id); setSelectedStepIdx(0); }}
                    style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 8, background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent', border: `1px solid ${isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`, transition: 'all 0.15s ease' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isActive ? '#f8fafc' : '#94a3b8' }}>
                        {p.vulnerabilityType?.replace('POTENTIAL_', '').replace('_', ' ')}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.riskScore >= 9 ? '#f87171' : '#fbbf24' }}>
                        {p.riskScore}/9
                      </span>
                    </div>
                    <div className="mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {p.sink?.name} ← {p.source?.expression}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
