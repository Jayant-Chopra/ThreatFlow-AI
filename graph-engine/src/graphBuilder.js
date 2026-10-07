/**
 * @file graphBuilder.js
 * @description Builds the attack-graph model from ThreatFlow analyzer output (schema 1.0).
 *
 * Contract rules followed (see docs/FINAL_OUTPUT_SCHEMA.md):
 * - Entities are joined only by their IDs, never by display names.
 * - Null values from the analyzer (e.g. a dynamic route path) are preserved, never invented.
 *
 * @author Ravish Gupta <ravishgupta071@gmail.com>
 */

'use strict';

const SUPPORTED_SCHEMA_VERSION = '1.0';

/** Analyzer collections that become graph nodes, with their entity category. */
const ENTITY_COLLECTIONS = [
  ['routes', 'ROUTE'],
  ['functions', 'FUNCTION'],
  ['sources', 'SOURCE'],
  ['variables', 'VARIABLE'],
  ['sinks', 'SINK']
];

/** React Flow node `type` per entity category. */
const NODE_TYPES = {
  ROUTE: 'routeNode',
  FUNCTION: 'functionNode',
  SOURCE: 'sourceNode',
  VARIABLE: 'variableNode',
  SINK: 'sinkNode'
};

/** Relationship types that carry user data from a source towards a sink. */
const DATA_FLOW_TYPES = new Set(['ASSIGNMENT', 'VARIABLE_TO_VARIABLE', 'DATA_FLOW']);

/**
 * Validates analyzer output against the schema 1.0 shape this engine relies on.
 * @param {Object} analyzerOutput
 * @returns {true}
 * @throws {Error} when the input cannot be safely consumed
 */
function validateSchema(analyzerOutput) {
  if (!analyzerOutput || typeof analyzerOutput !== 'object' || Array.isArray(analyzerOutput)) {
    throw new Error('Invalid analyzer output: expected a JSON object.');
  }

  if (analyzerOutput.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schema version: ${analyzerOutput.schemaVersion}. Expected "${SUPPORTED_SCHEMA_VERSION}".`
    );
  }

  const requiredArrays = [...ENTITY_COLLECTIONS.map(([field]) => field), 'relationships', 'findings'];
  for (const field of requiredArrays) {
    if (!Array.isArray(analyzerOutput[field])) {
      throw new Error(`Invalid schema: missing required array field "${field}".`);
    }
  }

  return true;
}

/**
 * Builds an ID -> entity map. Each entity gets an `entityCategory` field.
 * @param {Object} analyzerOutput
 * @returns {Map<string, Object>}
 * @throws {Error} on a missing or duplicate entity ID
 */
function buildEntityMap(analyzerOutput) {
  const entityMap = new Map();

  for (const [field, category] of ENTITY_COLLECTIONS) {
    for (const entity of analyzerOutput[field]) {
      if (!entity || typeof entity.id !== 'string') {
        throw new Error(`Invalid "${field}" entry: every entity needs a string "id".`);
      }
      if (entityMap.has(entity.id)) {
        throw new Error(`Duplicate entity id "${entity.id}" in analyzer output.`);
      }
      entityMap.set(entity.id, { ...entity, entityCategory: category });
    }
  }

  return entityMap;
}

/**
 * Builds forward/reverse adjacency lists from analyzer relationships.
 * Relationships whose endpoints do not exist are dropped and reported.
 * @param {Map<string, Object>} entityMap
 * @param {Array<Object>} relationships
 */
function buildAdjacency(entityMap, relationships) {
  const forward = new Map();
  const reverse = new Map();
  const validRelationships = [];
  const droppedRelationships = [];
  const seen = new Set();

  for (const id of entityMap.keys()) {
    forward.set(id, []);
    reverse.set(id, []);
  }

  for (const rel of relationships) {
    if (!rel || !entityMap.has(rel.from) || !entityMap.has(rel.to)) {
      droppedRelationships.push(rel);
      continue;
    }

    const key = `${rel.from}|${rel.to}|${rel.type}`;
    if (seen.has(key)) continue; // identical duplicate relationship
    seen.add(key);

    forward.get(rel.from).push({ id: rel.to, type: rel.type });
    reverse.get(rel.to).push({ id: rel.from, type: rel.type });
    validRelationships.push({ from: rel.from, to: rel.to, type: rel.type });
  }

  return { forward, reverse, validRelationships, droppedRelationships };
}

/**
 * Human-readable label and badge for an entity. Uses analyzer values as-is.
 * @param {Object} entity
 * @returns {{ label: string, badge: string }}
 */
function describeEntity(entity) {
  switch (entity.entityCategory) {
    case 'ROUTE':
      return {
        label: `${entity.method} ${entity.path === null ? '(dynamic path)' : entity.path}`,
        badge: 'ROUTE'
      };
    case 'FUNCTION':
      return { label: entity.name ? `${entity.name}()` : '(anonymous function)', badge: 'FUNCTION' };
    case 'SOURCE':
      return { label: entity.expression, badge: entity.type };
    case 'VARIABLE':
      return { label: entity.name, badge: 'VARIABLE' };
    case 'SINK':
      return { label: entity.name, badge: entity.type };
    default:
      return { label: entity.id, badge: entity.entityCategory };
  }
}

/**
 * Formats a `file:line` location, or null when the analyzer gave no location.
 * @param {Object} entity
 * @returns {string|null}
 */
function formatLocation(entity) {
  if (!entity || !entity.file) return null;
  return entity.line ? `${entity.file}:${entity.line}` : entity.file;
}

/**
 * Builds React Flow nodes. Attack-path flags are filled in later by index.js.
 * @param {Map<string, Object>} entityMap
 * @returns {Array<Object>}
 */
function buildNodes(entityMap) {
  const nodes = [];

  for (const entity of entityMap.values()) {
    const { entityCategory, ...raw } = entity;
    const { label, badge } = describeEntity(entity);

    nodes.push({
      id: entity.id,
      type: NODE_TYPES[entityCategory],
      position: { x: 0, y: 0 }, // set by layoutEngine
      data: {
        label,
        badge,
        category: entityCategory,
        file: entity.file ?? null,
        line: entity.line ?? null,
        location: formatLocation(entity),
        onAttackPath: false,
        isVulnerable: false,
        pathIds: [],
        findingIds: [],
        entity: raw
      }
    });
  }

  return nodes;
}

/**
 * Short edge label per relationship type.
 * @param {string} relationshipType
 * @returns {string}
 */
function formatEdgeLabel(relationshipType) {
  switch (relationshipType) {
    case 'ROUTE_TO_FUNCTION': return 'handled by';
    case 'ASSIGNMENT': return 'assigned to';
    case 'VARIABLE_TO_VARIABLE': return 'propagates to';
    case 'DATA_FLOW': return 'flows into';
    case 'FUNCTION_CALL': return 'calls';
    case 'HANDLER_READS_SOURCE': return 'reads input';
    case 'ROUTE_REACHES_SOURCE': return 'reaches input';
    default: return String(relationshipType).toLowerCase().replace(/_/g, ' ');
  }
}

/**
 * Builds React Flow edges from validated analyzer relationships.
 * @param {Array<Object>} validRelationships
 * @returns {Array<Object>}
 */
function buildEdges(validRelationships) {
  return validRelationships.map((rel) => ({
    id: `edge_${rel.from}_${rel.to}_${rel.type}`,
    source: rel.from,
    target: rel.to,
    type: 'smoothstep',
    animated: false,
    label: formatEdgeLabel(rel.type),
    data: {
      relationshipType: rel.type,
      derived: false,
      onAttackPath: false,
      pathIds: []
    }
  }));
}

/**
 * Builds the base graph model used by the rest of the engine.
 * @param {Object} analyzerOutput
 */
function buildGraphModel(analyzerOutput) {
  validateSchema(analyzerOutput);

  const entityMap = buildEntityMap(analyzerOutput);
  const adjacency = buildAdjacency(entityMap, analyzerOutput.relationships);

  return {
    project: analyzerOutput.project ?? null,
    analyzerSchemaVersion: analyzerOutput.schemaVersion,
    entityMap,
    adjacency,
    nodes: buildNodes(entityMap),
    edges: buildEdges(adjacency.validRelationships),
    findings: analyzerOutput.findings,
    diagnostics: {
      droppedRelationships: adjacency.droppedRelationships.length
    }
  };
}

module.exports = {
  SUPPORTED_SCHEMA_VERSION,
  NODE_TYPES,
  DATA_FLOW_TYPES,
  validateSchema,
  buildEntityMap,
  buildAdjacency,
  buildNodes,
  buildEdges,
  buildGraphModel,
  describeEntity,
  formatLocation,
  formatEdgeLabel
};
