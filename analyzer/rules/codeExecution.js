const { buildFindings } = require('../output/findingBuilder');
const { resolveRouteIdForFlow } = require('../model/programModel');
const { analyzeTaint } = require('../taint/taintAnalyzer');

const CODE_EXECUTION_SINK_NAMES = new Set(['eval', 'Function']);

function getExecutableArgument(sink, sinkTaint) {
  if (sink.name === 'eval') {
    return sinkTaint.arguments[0] ?? null;
  }

  return sinkTaint.arguments.at(-1) ?? null;
}

function collectCodeExecutionCandidates(programModel, taintResult = null) {
  if (!programModel) {
    return [];
  }

  const taint = taintResult ?? analyzeTaint(programModel);
  const taintBySinkId = new Map(taint.sinks.map((sinkTaint) => [sinkTaint.sinkId, sinkTaint]));
  const candidates = [];
  const findingKeys = new Set();

  for (const sink of programModel.sinks) {
    if (sink.type !== 'DANGEROUS_CODE_EXECUTION' || !CODE_EXECUTION_SINK_NAMES.has(sink.name)) {
      continue;
    }

    const executableArgument = getExecutableArgument(sink, taintBySinkId.get(sink.id) ?? { arguments: [] });
    if (!executableArgument?.isTainted) {
      continue;
    }

    for (const sourceId of executableArgument.sourceIds) {
      const key = `${sourceId}\u0000${sink.id}`;
      if (findingKeys.has(key)) {
        continue;
      }
      findingKeys.add(key);

      candidates.push({
        type: 'CODE_EXECUTION',
        severity: 'high',
        sourceId,
        sinkId: sink.id,
        routeId: resolveRouteIdForFlow(programModel, sourceId, sink.id),
        evidence: `Tainted HTTP input reaches ${sink.name} as executable code.`
      });
    }
  }

  return candidates;
}

function evaluateCodeExecution(programModel, taintResult = null, startIndex = 1) {
  return buildFindings(programModel, collectCodeExecutionCandidates(programModel, taintResult), startIndex);
}

module.exports = { collectCodeExecutionCandidates, evaluateCodeExecution };
