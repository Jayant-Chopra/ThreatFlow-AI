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
      const isHighlighted = activePathId
        ? (n.data?.pathIds || []).includes(activePathId)
        : n.data?.onAttackPath;

      return {
        ...n,
        type: 'cyberNode',
        data: {
          ...n.data,
          isHighlighted,
        },
      };
    });

    const computedEdges = rawEdges.map((e) => {
      const isPathEdge = activePathId
        ? (e.data?.pathIds || []).includes(activePathId)
        : e.data?.onAttackPath;

      return {
        ...e,
        animated: isPathEdge,
        style: {
          stroke: isPathEdge ? '#ef4444' : '#334155',
          strokeWidth: isPathEdge ? 2.5 : 1.5,
          opacity: activePathId && !isPathEdge ? 0.25 : 1,
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

  return (
    <div className="graph-canvas-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.data?.category === 'SINK') return '#ef4444';
            if (node.data?.category === 'ROUTE') return '#00f2fe';
            if (node.data?.category === 'SOURCE') return '#f59e0b';
            return '#475569';
          }}
          maskColor="rgba(6, 9, 17, 0.75)"
        />
      </ReactFlow>
    </div>
  );
}
