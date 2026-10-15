import React, { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ShieldCheck } from 'lucide-react';
import { CyberNode } from './CyberNode';

const nodeTypes = {
  routeNode: CyberNode,
  cyberNode: CyberNode,
  functionNode: CyberNode,
  sourceNode: CyberNode,
  variableNode: CyberNode,
  sinkNode: CyberNode,
  default: CyberNode,
};

export function AttackGraphCanvas({ graph, activePathId, onSelectNode }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const rawNodes = graph?.nodes || [];
    const rawEdges = graph?.edges || [];

    const computedNodes = rawNodes.map((n) => {
      const nodePathIds = n.data?.pathIds || [];
      const isOnActivePath = activePathId ? nodePathIds.includes(activePathId) : false;
      const isHighlighted = activePathId ? isOnActivePath : n.data?.onAttackPath;
      const isDimmed = activePathId ? !isOnActivePath : false;

      return {
        ...n,
        type: 'cyberNode',
        data: {
          ...n.data,
          isHighlighted,
          isDimmed,
        },
      };
    });

    const computedEdges = rawEdges.map((e) => {
      const edgePathIds = e.data?.pathIds || [];
      const isOnActivePath = activePathId ? edgePathIds.includes(activePathId) : false;
      const isAnimated = activePathId ? isOnActivePath : e.data?.onAttackPath;
      const isDimmed = activePathId ? !isOnActivePath : false;

      return {
        ...e,
        animated: !!isAnimated,
        style: {
          stroke: isOnActivePath ? '#ef4444' : isAnimated ? '#f87171' : '#334155',
          strokeWidth: isOnActivePath ? 2.5 : isAnimated ? 2 : 1.5,
          opacity: isDimmed ? 0.15 : 1,
        },
      };
    });

    setNodes(computedNodes);
    setEdges(computedEdges);
  }, [graph, activePathId, setNodes, setEdges]);

  const handleNodeClick = useCallback(
    (_, node) => {
      if (onSelectNode) {
        onSelectNode(node.data);
      }
    },
    [onSelectNode]
  );

  if (!graph?.nodes || graph.nodes.length === 0) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090d16', padding: 24 }}>
        <div style={{
          maxWidth: 480,
          textAlign: 'center',
          padding: '36px 32px',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <ShieldCheck size={28} color="#10b981" />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>
            No Graph Vulnerabilities Found
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6 }}>
            No source-to-sink taint data flow paths or vulnerable AST relationships were found in this project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={2.5}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const cat = node.data?.category;
            if (cat === 'SINK') return '#ef4444';
            if (cat === 'ROUTE') return '#a855f7';
            if (cat === 'SOURCE') return '#f59e0b';
            if (cat === 'VARIABLE') return '#06b6d4';
            return '#64748b';
          }}
          maskColor="rgba(9, 13, 22, 0.85)"
          style={{ background: '#090d16', border: '1px solid rgba(255, 255, 255, 0.1)' }}
        />
      </ReactFlow>
    </div>
  );
}
