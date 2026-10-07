/**
 * @file index.js
 * @description Public entry point of @threatflow/graph-engine.
 *
 * analyzeAttackGraph(analyzerOutput) takes the JSON produced by the ThreatFlow
 * analyzer (schema 1.0) and returns graph nodes/edges for React Flow, attack
 * paths with risk scores, and chokepoint remediation.
 *
 * @author Ravish Gupta <ravishgupta071@gmail.com>
 */

'use strict';

const { buildGraphModel, validateSchema, formatEdgeLabel } = require('./graphBuilder');
const { extractAttackPaths } = require('./pathAnalyzer');
const { scoreAllPaths } = require('./riskScorer');
const { analyzeChokepoints } = require('./chokepointEngine');
const { applyColumnLayout } = require('./layoutEngine');

const OUTPUT_SCHEMA_VERSION = '1.0';

/**
 * Marks nodes that lie on attack paths.
 */
function markNodes(nodes, paths) {
  const byId = new Map(nodes.map((n) => [n.id, { ...n, data: { ...n.data, pathIds: [], findingIds: [] } }]));

  for (const path of paths) {
    for (const nodeId of path.nodeIds) {
      const node = byId.get(nodeId);
      node.data.onAttackPath = true;
      node.data.pathIds.push(path.id);
      if (!node.data.findingIds.includes(path.findingId)) node.data.findingIds.push(path.findingId);
    }
    byId.get(path.sink.id).data.isVulnerable = true;
  }

  return [...byId.values()];
}

/**
 * Adds derived edges used by attack paths and marks edges on attack paths.
 */
function mergeEdges(edges, paths) {
  const result = edges.map((e) => ({ ...e, data: { ...e.data, pathIds: [] } }));
  const byPair = new Map(result.map((e) => [`${e.source}|${e.target}|${e.data.relationshipType}`, e]));

  for (const path of paths) {
    for (const link of path.links) {
      const key = `${link.from}|${link.to}|${link.type}`;
      let edge = byPair.get(key);
      if (!edge) {
        edge = {
          id: `derived_${link.from}_${link.to}`,
          source: link.from,
          target: link.to,
          type: 'smoothstep',
          animated: false,
          label: formatEdgeLabel(link.type),
          data: { relationshipType: link.type, derived: true, basis: link.basis || null, onAttackPath: false, pathIds: [] }
        };
        result.push(edge);
        byPair.set(key, edge);
      }
      edge.animated = true;
      edge.data.onAttackPath = true;
      if (!edge.data.pathIds.includes(path.id)) edge.data.pathIds.push(path.id);
    }
  }

  return result;
}

/**
 * Main function used by the backend.
 * @param {Object} analyzerOutput analyzer JSON (schema 1.0)
 * @returns {Object}
 */
function analyzeAttackGraph(analyzerOutput) {
  const model = buildGraphModel(analyzerOutput);
  const { paths, unresolvedFindings } = extractAttackPaths(model);
  const { scoredPaths, summary: riskSummary } = scoreAllPaths(paths);
  const chokepoints = analyzeChokepoints(scoredPaths, model.entityMap);

  const nodes = applyColumnLayout(markNodes(model.nodes, scoredPaths));
  const edges = mergeEdges(model.edges, scoredPaths);

  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    analyzerSchemaVersion: model.analyzerSchemaVersion,
    project: model.project,
    graph: { nodes, edges },
    attackPaths: scoredPaths,
    chokepoints,
    riskSummary,
    diagnostics: {
      unresolvedFindings,
      droppedRelationships: model.diagnostics.droppedRelationships
    },
    summary: {
      nodes: nodes.length,
      edges: edges.length,
      derivedEdges: edges.filter((e) => e.data.derived).length,
      findings: model.findings.length,
      attackPaths: scoredPaths.length,
      unresolvedFindings: unresolvedFindings.length
    }
  };
}

module.exports = {
  OUTPUT_SCHEMA_VERSION,
  analyzeAttackGraph,
  validateSchema
};
