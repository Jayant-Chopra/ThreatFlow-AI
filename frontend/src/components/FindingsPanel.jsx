import React, { useRef } from 'react';
import {
  Upload,
  Play,
  Activity,
} from 'lucide-react';

export function FindingsPanel({
  findings = [],
  summary: _summary,
  isScanning,
  onRunScan,
  onUploadFile,
  activeTarget,
  onChangeTarget,
  selectedNode,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUploadFile) {
      onUploadFile(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Target Selector & Scanner Launcher */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}>
        <label style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Select Target Project
        </label>
        
        <select
          value={activeTarget}
          onChange={(e) => onChangeTarget(e.target.value)}
          style={{
            width: '100%',
            marginTop: 6,
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            color: '#f8fafc',
            fontSize: '0.82rem',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        >
          <option value="test-project">Express AST Test Suite (3 Injections, Multi-tier)</option>
          <option value="demo-app">Demo Vulnerable App (Public API Breach)</option>
        </select>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            className="btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            disabled={isScanning}
            onClick={() => onRunScan(activeTarget)}
          >
            {isScanning ? (
              <>
                <Activity size={14} className="pulse-dot" />
                <span>Scanning AST...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Run AST Scan</span>
              </>
            )}
          </button>

          <button
            className="btn-secondary"
            title="Upload Project ZIP or .js file"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".zip,.js,.json"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Selected Node Details (if user clicked a node on the graph) */}
      {selectedNode && (
        <div style={{ padding: '12px 16px', background: 'rgba(0, 242, 254, 0.05)', borderBottom: '1px solid rgba(0, 242, 254, 0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: '#00f2fe', fontWeight: 700, textTransform: 'uppercase' }}>
              Selected Node Inspector
            </span>
            <span className="mono" style={{ fontSize: '0.68rem', color: '#64748b' }}>
              {selectedNode.category}
            </span>
          </div>
          <div className="mono" style={{ fontSize: '0.82rem', color: '#f1f5f9', fontWeight: 600, marginTop: 4 }}>
            {selectedNode.label}
          </div>
          {selectedNode.location && (
            <div className="mono" style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
              {selectedNode.location}
            </div>
          )}
        </div>
      )}

      {/* Findings Telemetry Stats */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
          AST FINDINGS ({findings.length})
        </span>
        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
          Phase 1 Engine
        </span>
      </div>

      {/* Findings List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {findings.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
            No vulnerabilities detected in this scope.
          </div>
        ) : (
          findings.map((f, idx) => (
            <div key={f.id || idx} className="finding-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: f.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: f.severity === 'CRITICAL' ? '#f87171' : '#fbbf24',
                    border: `1px solid ${f.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                  }}
                >
                  {f.severity || 'HIGH'}
                </span>
                <span className="mono" style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {f.file}:{f.line}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f1f5f9', marginTop: 4 }}>
                {f.type || 'VULNERABILITY'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6, fontSize: '0.73rem', color: '#94a3b8' }}>
                {f.source && (
                  <div>
                    <span style={{ color: '#64748b' }}>Source: </span>
                    <span className="mono" style={{ color: '#fbbf24' }}>{f.source}</span>
                  </div>
                )}
                {f.sink && (
                  <div>
                    <span style={{ color: '#64748b' }}>Sink: </span>
                    <span className="mono" style={{ color: '#f87171' }}>{f.sink}</span>
                  </div>
                )}
              </div>

              {f.evidence && (
                <div
                  className="mono"
                  style={{
                    marginTop: 8,
                    padding: '6px 8px',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: 4,
                    fontSize: '0.7rem',
                    color: '#cbd5e1',
                    borderLeft: '2px solid #ef4444',
                    overflowX: 'auto',
                  }}
                >
                  {f.evidence}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
