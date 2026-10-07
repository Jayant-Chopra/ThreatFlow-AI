/**
 * @file pathAnalyzer.js
 * @description Builds attack paths from analyzer findings.
 *
 * One attack path is produced per analyzer finding, and only for findings.
 * A source->sink data flow without a finding (e.g. a parameterized SQL query)
 * is NOT an attack path: the analyzer deliberately does not report it.
 *
 * For each finding:
 *  1. Sink:    the SINK entity at the finding's file + line (preferring the same sink name).
 *  2. Chain:   shortest data-flow chain (ASSIGNMENT / VARIABLE_TO_VARIABLE / DATA_FLOW
 *              relationships) from a SOURCE whose expression equals finding.source to that sink.
 *              Found by reverse breadth-first search from the sink (cycle-safe).
 *  3. Route:   the ROUTE whose "METHOD path" equals finding.route (null stays null).
 *  4. Handler: the function linked to that route by a ROUTE_TO_FUNCTION relationship
 *              that is in the same file as the source and starts at or before it.
 *
 * Findings that cannot be resolved this way are reported in `unresolvedFindings`
 * instead of being guessed.
 *
 * @author Ravish Gupta <ravishgupta071@gmail.com>
 */

'use strict';

const { DATA_FLOW_TYPES, describeEntity, formatLocation } = require('./graphBuilder');

/**
 * Finds SINK entities matching a finding's location.
 * @param {Object} finding
 * @param {Map<string, Object>} entityMap
 * @returns {Array<Object>} candidate sinks, best first
 */
function findSinkCandidates(finding, entityMap) {
  const atLocation = [];
  for (const entity of entityMap.values()) {
    if (entity.entityCategory === 'SINK' && entity.file === finding.file && entity.line === finding.line) {
      atLocation.push(entity);
    }
  }

  const sameName = atLocation.filter((sink) => sink.name === finding.sink);
  if (sameName.length > 0) return sameName.sort(byId);
  // Accept a differently named sink only when it is the single sink at that exact location.
  return atLocation.length === 1 ? atLocation : [];
}

/**
 * Shortest data-flow chain from a matching SOURCE to the given sink.
 * Reverse BFS over data-flow relationships; visited set makes it cycle-safe.
 * @param {string} sinkId
 * @param {string} sourceExpression finding.source
 * @param {Object} adjacency from buildAdjacency
 * @param {Map<string, Object>} entityMap
 * @returns {Array<{id: string, type: string|null}>|null} chain from source to sink
 *          (`type` = relationship type into that node), or null when none exists
 */
function findDataFlowChain(sinkId, sourceExpression, adjacency, entityMap) {
  const parent = new Map([[sinkId, null]]); // nodeId -> { next, type } towards the sink
  const queue = [sinkId];

  while (queue.length > 0) {
    const current = queue.shift();
    const entity = entityMap.get(current);

    if (entity.entityCategory === 'SOURCE' && entity.expression === sourceExpression) {
      const chain = [];
      let node = current;
      let incomingType = null;
      while (node !== null) {
        chain.push({ id: node, type: incomingType });
        const step = parent.get(node);
        if (!step) break;
        incomingType = step.type;
        node = step.next;
      }
      return chain;
    }

    for (const edge of adjacency.reverse.get(current) || []) {
      if (!DATA_FLOW_TYPES.has(edge.type) || parent.has(edge.id)) continue;
      parent.set(edge.id, { next: current, type: edge.type });
      queue.push(edge.id);
    }
  }

  return null;
}

/**
 * Resolves the route and handler for a finding.
 * @param {Object} finding
 * @param {Object} source resolved SOURCE entity
 * @param {Object} adjacency
 * @param {Map<string, Object>} entityMap
 * @returns {{ route: Object|null, handler: Object|null }}
 */
function resolveRouteAndHandler(finding, source, adjacency, entityMap) {
  if (!finding.route) return { route: null, handler: null };

  const routes = [];
  for (const entity of entityMap.values()) {
    if (entity.entityCategory === 'ROUTE' && entity.path !== null && `${entity.method} ${entity.path}` === finding.route) {
      routes.push(entity);
    }
  }
  routes.sort(byId);
  if (routes.length === 0) return { route: null, handler: null };

  // Prefer the route whose handler function contains the source:
  // same file, starts at or before the source line, closest start wins.
  let best = null;
  for (const route of routes) {
    for (const edge of adjacency.forward.get(route.id) || []) {
      if (edge.type !== 'ROUTE_TO_FUNCTION') continue;
      const handler = entityMap.get(edge.id);
      if (handler.file !== source.file || !handler.line || !source.line || handler.line > source.line) continue;
      const distance = source.line - handler.line;
      if (!best || distance < best.distance) best = { route, handler, distance };
    }
  }

  if (best) return { route: best.route, handler: best.handler };
  // Route known from the finding, but its handler could not be linked to the source.
  return routes.length === 1 ? { route: routes[0], handler: null } : { route: null, handler: null };
}

/**
 * Converts a node ID chain into display steps.
 * @param {Array<string>} nodeIds
 * @param {Map<string, Object>} entityMap
 */
function buildSteps(nodeIds, entityMap) {
  return nodeIds.map((id, index) => {
    const entity = entityMap.get(id);
    const { label, badge } = describeEntity(entity);
    return {
      stepNumber: index + 1,
      id,
      category: entity.entityCategory,
      label,
      badge,
      file: entity.file ?? null,
      line: entity.line ?? null,
      location: formatLocation(entity)
    };
  });
}

/**
 * Picks plain fields of an entity for the attack-path summary.
 */
function pick(entity, fields) {
  if (!entity) return null;
  const out = {};
  for (const field of fields) out[field] = entity[field] ?? null;
  return out;
}

function byId(a, b) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Builds one attack path per resolvable finding.
 * @param {Object} graphModel from buildGraphModel
 * @returns {{ paths: Array<Object>, unresolvedFindings: Array<Object> }}
 */
function extractAttackPaths(graphModel) {
  const { entityMap, adjacency, findings } = graphModel;
  const paths = [];
  const unresolvedFindings = [];

  for (const finding of findings) {
    const sinks = findSinkCandidates(finding, entityMap);
    if (sinks.length === 0) {
      unresolvedFindings.push({ findingId: finding.id, reason: 'No sink entity at the finding location.' });
      continue;
    }

    let sink = null;
    let chain = null;
    for (const candidate of sinks) {
      chain = findDataFlowChain(candidate.id, finding.source, adjacency, entityMap);
      if (chain) {
        sink = candidate;
        break;
      }
    }

    if (!chain) {
      unresolvedFindings.push({
        findingId: finding.id,
        reason: `No data-flow chain from source "${finding.source}" to the sink at ${finding.file}:${finding.line}.`
      });
      continue;
    }

    const source = entityMap.get(chain[0].id);
    const { route, handler } = resolveRouteAndHandler(finding, source, adjacency, entityMap);

    // Links between consecutive nodes, each with the basis it comes from.
    const nodeIds = [];
    const links = [];
    if (route) nodeIds.push(route.id);
    if (route && handler) {
      nodeIds.push(handler.id);
      links.push({ from: route.id, to: handler.id, type: 'ROUTE_TO_FUNCTION', derived: false });
      links.push({
        from: handler.id,
        to: source.id,
        type: 'HANDLER_READS_SOURCE',
        derived: true,
        basis: 'finding.route + handler starts before the source in the same file'
      });
    } else if (route) {
      links.push({
        from: route.id,
        to: source.id,
        type: 'ROUTE_REACHES_SOURCE',
        derived: true,
        basis: 'finding.route'
      });
    }

    chain.forEach((step, index) => {
      nodeIds.push(step.id);
      if (index > 0) links.push({ from: chain[index - 1].id, to: step.id, type: step.type, derived: false });
    });

    paths.push({
      id: `PATH-${String(paths.length + 1).padStart(3, '0')}`,
      findingId: finding.id,
      vulnerabilityType: finding.type,
      analyzerSeverity: finding.severity,
      title: finding.title,
      routeResolved: route !== null,
      route: pick(route, ['id', 'method', 'path', 'file', 'line']),
      handler: pick(handler, ['id', 'name', 'file', 'line']),
      source: pick(source, ['id', 'type', 'expression', 'file', 'line']),
      sink: pick(sink, ['id', 'type', 'name', 'file', 'line']),
      nodeIds,
      links,
      steps: buildSteps(nodeIds, entityMap),
      hopCount: links.length,
      evidence: finding.evidence ?? null
    });
  }

  return { paths, unresolvedFindings };
}

module.exports = {
  findSinkCandidates,
  findDataFlowChain,
  resolveRouteAndHandler,
  buildSteps,
  extractAttackPaths
};
