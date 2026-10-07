const { buildFindings } = require('../output/findingBuilder');
const { resolveRouteIdForFlow } = require('../model/programModel');
const { analyzeTaint } = require('../taint/taintAnalyzer');

const COMMAND_SINK_NAMES = new Set(['exec', 'execSync', 'spawn', 'spawnSync']);

function describeCommandOperation(argumentTaint) {
  if (argumentTaint.paths.some((path) => path.operations.includes('TEMPLATE_LITERAL'))) {
    return 'a template literal command';
  }

  if (argumentTaint.paths.some((path) => path.operations.includes('STRING_CONCATENATION'))) {
    return 'string concatenation';
  }

  return 'a tainted command argument';
}

function collectCommandInjectionCandidates(programModel, taintResult = null) {
  if (!programModel) {
    return [];
  }

  const taint = taintResult ?? analyzeTaint(programModel);
  const taintBySinkId = new Map(taint.sinks.map((sinkTaint) => [sinkTaint.sinkId, sinkTaint]));
  const candidates = [];
  const findingKeys = new Set();

  for (const sink of programModel.sinks) {
    if (sink.type !== 'COMMAND_EXECUTION' || !COMMAND_SINK_NAMES.has(sink.name)) {
      continue;
    }

    const commandArgument = taintBySinkId.get(sink.id)?.arguments[0];
    if (!commandArgument?.isTainted) {
      continue;
    }

    for (const sourceId of commandArgument.sourceIds) {
      const key = `${sourceId}\u0000${sink.id}`;
      if (findingKeys.has(key)) {
        continue;
      }
      findingKeys.add(key);

      candidates.push({
        type: 'COMMAND_INJECTION',
        severity: 'high',
        sourceId,
        sinkId: sink.id,
        routeId: resolveRouteIdForFlow(programModel, sourceId, sink.id),
        evidence: `Tainted HTTP input reaches ${sink.name} through ${describeCommandOperation(commandArgument)}.`
      });
    }
  }

  return candidates;
}

function evaluateCommandInjection(programModel, taintResult = null, startIndex = 1) {
  return buildFindings(programModel, collectCommandInjectionCandidates(programModel, taintResult), startIndex);
}

module.exports = { collectCommandInjectionCandidates, evaluateCommandInjection };
