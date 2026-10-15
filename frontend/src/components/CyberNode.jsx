import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Globe, Code2, LogIn, Boxes, AlertOctagon, Cpu } from 'lucide-react';

const CATEGORY_THEMES = {
  ROUTE: {
    icon: Globe,
    title: 'INGRESS ROUTE',
    border: '#a855f7', // Purple accent
    badgeColor: '#c084fc',
    badgeBg: 'rgba(168, 85, 247, 0.16)',
    glow: 'rgba(168, 85, 247, 0.4)',
  },
  FUNCTION: {
    icon: Code2,
    title: 'CONTROLLER',
    border: '#64748b', // Slate
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(100, 116, 139, 0.16)',
    glow: 'rgba(100, 116, 139, 0.3)',
  },
  SOURCE: {
    icon: LogIn,
    title: 'TAINT SOURCE',
    border: '#f59e0b', // Amber
    badgeColor: '#fbbf24',
    badgeBg: 'rgba(245, 158, 11, 0.18)',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
  VARIABLE: {
    icon: Boxes,
    title: 'DATA FLOW VAR',
    border: '#06b6d4', // Cyan
    badgeColor: '#22d3ee',
    badgeBg: 'rgba(6, 182, 212, 0.16)',
    glow: 'rgba(6, 182, 212, 0.4)',
  },
  SINK: {
    icon: AlertOctagon,
    title: 'DANGEROUS SINK',
    border: '#ef4444', // Red / Alert
    badgeColor: '#f87171',
    badgeBg: 'rgba(239, 68, 68, 0.22)',
    glow: 'rgba(239, 68, 68, 0.55)',
  },
};

export const CyberNode = memo(({ data, selected }) => {
  const category = (data.category || data.badge || 'FUNCTION').toUpperCase();
  const theme = CATEGORY_THEMES[category] || {
    icon: Cpu,
    title: category,
    border: '#64748b',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(100, 116, 139, 0.15)',
    glow: 'none',
  };

  const IconComponent = theme.icon;
  const isSink = category === 'SINK';
  const isDimmed = data.isDimmed;
  const isHighlighted = data.isHighlighted;

  return (
    <div
      style={{
        width: 185,
        background: isHighlighted ? 'rgba(15, 23, 42, 0.95)' : 'rgba(11, 17, 32, 0.88)',
        backdropFilter: 'blur(10px)',
        borderRadius: 8,
        border: `1px solid ${isHighlighted ? theme.border : 'rgba(255, 255, 255, 0.08)'}`,
        borderLeft: `4px solid ${theme.border}`,
        boxShadow: isHighlighted ? `0 0 16px ${theme.glow}` : selected ? '0 0 12px rgba(255,255,255,0.2)' : '0 4px 12px rgba(0,0,0,0.5)',
        padding: '8px 10px',
        opacity: isDimmed ? 0.22 : 1,
        filter: isDimmed ? 'grayscale(0.7)' : 'none',
        transition: 'all 0.25s ease',
        cursor: 'pointer',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: theme.border,
          width: 7,
          height: 7,
          border: '2px solid #090d16',
        }}
      />

      {/* Header Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <IconComponent size={12} color={theme.badgeColor} />
          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: theme.badgeColor, letterSpacing: 0.5 }}>
            {theme.title}
          </span>
        </div>
        {data.line && (
          <span className="mono" style={{ fontSize: '0.62rem', color: '#64748b' }}>
            L:{data.line}
          </span>
        )}
      </div>

      {/* Label & Location */}
      <div style={{ marginTop: 2 }}>
        <div
          className="mono"
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: isSink ? '#fca5a5' : '#f8fafc',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={data.label}
        >
          {data.label || 'Unknown'}
        </div>
        {data.location && (
          <div
            className="mono"
            style={{
              fontSize: '0.65rem',
              color: '#64748b',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={data.location}
          >
            {data.location}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: theme.border,
          width: 7,
          height: 7,
          border: '2px solid #090d16',
        }}
      />
    </div>
  );
});

CyberNode.displayName = 'CyberNode';
