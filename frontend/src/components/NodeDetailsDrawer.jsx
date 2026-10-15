import React from 'react';
import {
  X,
  Globe,
  Code2,
  LogIn,
  Boxes,
  AlertOctagon,
  FileCode,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  Filter,
  ExternalLink,
} from 'lucide-react';

const CATEGORY_ICONS = {
  ROUTE: Globe,
  FUNCTION: Code2,
  SOURCE: LogIn,
  VARIABLE: Boxes,
  SINK: AlertOctagon,
};

const CATEGORY_COLORS = {
  ROUTE: { color: '#c084fc', border: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', label: 'Ingress Route' },
  FUNCTION: { color: '#94a3b8', border: '#64748b', bg: 'rgba(100, 116, 139, 0.15)', label: 'Function / Handler' },
  SOURCE: { color: '#fbbf24', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'Taint Input Source' },
  VARIABLE: { color: '#22d3ee', border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', label: 'Data Flow Variable' },
  SINK: { color: '#f87171', border: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', label: 'Dangerous Sink' },
};

export function NodeDetailsDrawer({ node, onClose, onSelectPath }) {
  if (!node) return null;

  const category = (node.category || node.badge || 'FUNCTION').toUpperCase();
  const theme = CATEGORY_COLORS[category] || CATEGORY_COLORS.FUNCTION;
  const IconComponent = CATEGORY_ICONS[category] || Code2;
  const pathIds = node.pathIds || [];
  const isOnPath = node.onAttackPath || pathIds.length > 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        bottom: 16,
        width: 380,
        zIndex: 50,
        background: 'rgba(9, 13, 24, 0.96)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${theme.border}66`,
        borderRadius: 14,
        boxShadow: `0 12px 40px rgba(0, 0, 0, 0.7), 0 0 24px ${theme.border}22`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideInRight 0.25s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: theme.bg,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(15, 23, 42, 0.8)',
              border: `1px solid ${theme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconComponent size={20} color={theme.color} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: theme.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {theme.label}
            </div>
            <div className="mono" style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {node.label || 'Node Details'}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: 6,
            color: '#94a3b8',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Close details"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body Content */}
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Status Badge */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            background: isOnPath ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            border: `1px solid ${isOnPath ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {isOnPath ? <ShieldAlert size={18} color="#ef4444" /> : <ShieldCheck size={18} color="#10b981" />}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isOnPath ? '#f87171' : '#34d399' }}>
              {isOnPath ? 'Part of Active Attack Path' : 'Safe Context Node'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              {isOnPath ? `Participates in: ${pathIds.join(', ')}` : 'No untrusted taint flows through this node'}
            </div>
          </div>
        </div>

        {/* Location Box */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.07)', padding: 14 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={13} />
            <span>AST Code Coordinates</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#94a3b8' }}>File Path:</span>
              <span className="mono" style={{ color: '#22d3ee', fontWeight: 600 }}>{node.file || node.location?.split(':')[0] || 'Unknown'}</span>
            </div>
            {node.line && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: '#94a3b8' }}>Line Number:</span>
                <span className="mono" style={{ color: '#f8fafc', fontWeight: 600 }}>Line {node.line}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: '#94a3b8' }}>Exact Location:</span>
              <span className="mono" style={{ color: '#e2e8f0', fontSize: '0.72rem' }}>{node.location || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Node Entity Breakdown */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.07)', padding: 14 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileCode size={13} />
            <span>AST Node Expression</span>
          </div>
          <div
            className="mono"
            style={{
              padding: '10px 12px',
              borderRadius: 6,
              background: 'rgba(9, 13, 22, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '0.8rem',
              color: '#f8fafc',
              wordBreak: 'break-all',
            }}
          >
            {node.entity?.expression || node.entity?.name || node.label || 'N/A'}
          </div>
          {node.entity?.type && (
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 6 }}>
              Type: <span className="mono" style={{ color: '#c084fc' }}>{node.entity.type}</span>
            </div>
          )}
        </div>

        {/* Attack Path Filter Actions */}
        {pathIds.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Associated Attack Scenarios
            </div>
            {pathIds.map((pId) => (
              <button
                key={pId}
                onClick={() => {
                  if (onSelectPath) onSelectPath(pId);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  color: '#22d3ee',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Filter size={13} />
                  <span>Highlight Path {pId}</span>
                </div>
                <ExternalLink size={13} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span className="mono" style={{ fontSize: '0.68rem', color: '#64748b' }}>
          ID: {node.id}
        </span>
        <button
          onClick={onClose}
          style={{
            padding: '4px 12px',
            borderRadius: 6,
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#cbd5e1',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
