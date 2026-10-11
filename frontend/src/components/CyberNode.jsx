import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Globe, Code2, LogIn, Boxes, AlertOctagon, ShieldAlert, Cpu } from 'lucide-react';

const CATEGORY_CONFIG = {
  ROUTE: {
    icon: Globe,
    badgeColor: '#00f2fe',
    badgeBg: 'rgba(0, 242, 254, 0.15)',
    border: '#00f2fe',
    title: 'INGRESS ROUTE',
  },
  FUNCTION: {
    icon: Code2,
    badgeColor: '#818cf8',
    badgeBg: 'rgba(99, 102, 241, 0.15)',
    border: '#6366f1',
    title: 'CONTROLLER',
  },
  SOURCE: {
    icon: LogIn,
    badgeColor: '#fbbf24',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    border: '#f59e0b',
    title: 'USER TAINT SOURCE',
  },
  VARIABLE: {
    icon: Boxes,
    badgeColor: '#c084fc',
    badgeBg: 'rgba(139, 92, 246, 0.15)',
    border: '#8b5cf6',
    title: 'DATA FLOW VAR',
  },
  SINK: {
    icon: AlertOctagon,
    badgeColor: '#f87171',
    badgeBg: 'rgba(239, 68, 68, 0.2)',
    border: '#ef4444',
    title: 'CRITICAL SINK',
  },
};

export const CyberNode = memo(({ data, selected }) => {
  const category = (data.category || data.badge || 'FUNCTION').toUpperCase();
  const config = CATEGORY_CONFIG[category] || {
    icon: Cpu,
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.15)',
    border: '#64748b',
    title: category,
  };

  const IconComponent = config.icon;
  const isVulnerable = data.isVulnerable || category === 'SINK';
  const onPath = data.onAttackPath;

  return (
    <div
      className={`custom-node category-${category} ${isVulnerable ? 'node-vulnerable' : ''} ${
        selected ? 'node-selected' : ''
      }`}
      style={{
        borderLeft: `4px solid ${config.border}`,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: config.border,
          width: 8,
          height: 8,
          border: '2px solid #070a12',
        }}
      />

      <div className="node-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: config.badgeColor }}>
          <IconComponent size={12} />
          <span>{config.title}</span>
        </div>
        {data.line && (
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
            L:{data.line}
          </span>
        )}
      </div>

      <div className="node-body">
        <div className="node-label mono" style={{ color: isVulnerable ? '#fca5a5' : '#f8fafc' }}>
          {data.label || 'Unknown Node'}
        </div>
        {data.location && (
          <div className="node-location mono" title={data.location}>
            {data.location}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: config.border,
          width: 8,
          height: 8,
          border: '2px solid #070a12',
        }}
      />
    </div>
  );
});

CyberNode.displayName = 'CyberNode';
