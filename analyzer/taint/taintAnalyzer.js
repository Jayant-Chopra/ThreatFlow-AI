const { getProgramModelContext } = require('../model/programModel');

const TAINT_RELATIONSHIP_TYPES = new Set(['ASSIGNMENT', 'VARIABLE_TO_VARIABLE', 'DATA_FLOW']);

function compareRelationships(left, right) {
  return `${left.from}\u0000${left.to}\u0000${left.type}`.localeCompare(
    `${right.from}\u0000${right.to}\u0000${right.type}`
  );
}

function buildIncomingRelationships(programModel) {
  const incoming = new Map();

  for (const relationship of programModel.relationships) {
    if (!TAINT_RELATIONSHIP_TYPES.has(relationship.type)) {
      continue;
    }

    const relationships = incoming.get(relationship.to) ?? [];
    relationships.push(relationship);
    incoming.set(relationship.to, relationships);
  }

  for (const relationships of incoming.values()) {
    relationships.sort(compareRelationships);
  }

  return incoming;
}

function findSourcePaths(nodeId, sourceIds, incomingRelationships) {
  const paths = [];

  function visit(currentId, reversedPath, visited) {
    if (sourceIds.has(currentId)) {
      paths.push([...reversedPath].reverse());
      return;
    }

    for (const relationship of incomingRelationships.get(currentId) ?? []) {
      if (!visited.has(relationship.from)) {
        visit(
          relationship.from,
          [...reversedPath, relationship],
          new Set([...visited, relationship.from])
        );
      }
    }
  }

  visit(nodeId, [], new Set([nodeId]));
  return paths;
}

function getPathOperations(path, modelContext) {
  const operations = [];

  for (const relationship of path) {
    if (relationship.type === 'VARIABLE_TO_VARIABLE' || relationship.type === 'ASSIGNMENT') {
      const values = modelContext?.variableValues.get(relationship.to) ?? [];
      const value = values.find((candidate) => (
        candidate.expression.sourceIds.includes(relationship.from) ||
        candidate.expression.variableIds.includes(relationship.from)
      ));
      if (value) {
        operations.push(value.expression.kind);
      }
    }
  }

  return [...new Set(operations)];
}

function createArgumentTaint(argument, argumentIndex, sinkId, sourceIds, incomingRelationships, modelContext) {
  const pathsByKey = new Map();
  const directNodeIds = [...argument.sourceIds, ...argument.variableIds].sort();

  for (const nodeId of directNodeIds) {
    for (const pathToNode of findSourcePaths(nodeId, sourceIds, incomingRelationships)) {
      const path = [...pathToNode, { from: nodeId, to: sinkId, type: 'DATA_FLOW' }];
      const key = path.map((relationship) => (
        `${relationship.from}|${relationship.to}|${relationship.type}`
      )).join('>');
      pathsByKey.set(key, path);
    }
  }

  const paths = [...pathsByKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, path]) => ({
      operations: [...getPathOperations(path, modelContext), argument.kind],
      relationships: path,
      sourceId: path[0]?.from ?? null
    }));
  const taintSourceIds = [...new Set(paths.map((path) => path.sourceId).filter(Boolean))].sort();

  return {
    argumentIndex,
    expressionKind: argument.kind,
    isTainted: taintSourceIds.length > 0,
    paths,
    sourceIds: taintSourceIds
  };
}

function analyzeTaint(programModel) {
  const modelContext = getProgramModelContext(programModel);
  const sourceIds = new Set(programModel.sources.map((source) => source.id));
  const incomingRelationships = buildIncomingRelationships(programModel);
  const sinkResults = programModel.sinks.map((sink) => {
    const sinkDetails = modelContext?.sinkDetails.get(sink.id) ?? { arguments: [], isParameterized: false };
    const argumentsTaint = sinkDetails.arguments.map((argument, argumentIndex) => (
      createArgumentTaint(
        argument,
        argumentIndex,
        sink.id,
        sourceIds,
        incomingRelationships,
        modelContext
      )
    ));
    const sourceIdsForSink = [...new Set(argumentsTaint.flatMap((argument) => argument.sourceIds))].sort();

    return {
      arguments: argumentsTaint,
      isParameterized: sinkDetails.isParameterized,
      isTainted: sourceIdsForSink.length > 0,
      sinkId: sink.id,
      sourceIds: sourceIdsForSink
    };
  });

  return { sinks: sinkResults };
}

function getSinkTaint(taintResult, sinkId) {
  return taintResult.sinks.find((sink) => sink.sinkId === sinkId) ?? null;
}

module.exports = {
  analyzeTaint,
  getSinkTaint
};
