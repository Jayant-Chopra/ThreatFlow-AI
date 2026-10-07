const { buildFindings } = require('../output/findingBuilder');
const { resolveRouteIdForFlow } = require('../model/programModel');
const { analyzeTaint } = require('../taint/taintAnalyzer');

const UNSAFE_SQL_OPERATIONS = new Set(['STRING_CONCATENATION', 'TEMPLATE_LITERAL']);

function getUnsafePaths(argumentTaint) {
  return argumentTaint.paths.filter((path) => (
    path.operations.some((operation) => UNSAFE_SQL_OPERATIONS.has(operation))
  ));
}

function describeUnsafeOperation(path) {
  if (path.operations.includes('TEMPLATE_LITERAL')) {
    return 'a template literal';
  }

  return 'string concatenation';
}

function collectSqlInjectionCandidates(programModel, taintResult = null) {
  if (!programModel) {
    return [];
  }

  const taint = taintResult ?? analyzeTaint(programModel);
  const taintBySinkId = new Map(taint.sinks.map((sinkTaint) => [sinkTaint.sinkId, sinkTaint]));
  const candidates = [];
  const findingKeys = new Set();

  for (const sink of programModel.sinks) {
    if (sink.type !== 'DATABASE') {
      continue;
    }

    const sinkTaint = taintBySinkId.get(sink.id);
    if (!sinkTaint || sinkTaint.isParameterized) {
      continue;
    }

    const queryArgument = sinkTaint.arguments[0];
    if (!queryArgument?.isTainted) {
      continue;
    }

    for (const path of getUnsafePaths(queryArgument)) {
      const key = `${path.sourceId}\u0000${sink.id}`;
      if (findingKeys.has(key)) {
        continue;
      }
      findingKeys.add(key);

      candidates.push({
        type: 'SQL_INJECTION',
        severity: 'high',
        sourceId: path.sourceId,
        sinkId: sink.id,
        routeId: resolveRouteIdForFlow(programModel, path.sourceId, sink.id),
        evidence: `Tainted HTTP input reaches a database query through ${describeUnsafeOperation(path)}.`
      });
    }
  }

  return candidates;
}

function evaluateSqlInjection(programModel, taintResult = null, startIndex = 1) {
  return buildFindings(programModel, collectSqlInjectionCandidates(programModel, taintResult), startIndex);
}

module.exports = { collectSqlInjectionCandidates, evaluateSqlInjection };
