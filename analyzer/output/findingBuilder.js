function buildOutput(programModel) {
  return programModel.toOutput();
}

const FINDING_TYPES = Object.freeze({
  SQL_INJECTION: { severity: 'HIGH', title: 'Potential SQL Injection' },
  COMMAND_INJECTION: { severity: 'HIGH', title: 'Potential Command Injection' },
  CODE_EXECUTION: { severity: 'HIGH', title: 'Potential Dangerous Code Execution' }
});
const TYPE_ALIASES = Object.freeze({ DANGEROUS_CODE_EXECUTION: 'CODE_EXECUTION' });
const SEVERITIES = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

function formatFindingId(index) {
  return `finding_${String(index).padStart(3, '0')}`;
}

function normalizeFindingType(type) {
  const normalizedType = TYPE_ALIASES[type] ?? type;
  if (!FINDING_TYPES[normalizedType]) {
    throw new Error(`Unsupported finding type: ${type}`);
  }
  return normalizedType;
}

function normalizeSeverity(severity, type) {
  const normalizedSeverity = (severity ?? FINDING_TYPES[type].severity).toUpperCase();
  if (!SEVERITIES.has(normalizedSeverity)) {
    throw new Error(`Unsupported finding severity: ${severity}`);
  }
  return normalizedSeverity;
}

function resolveRoute(routeId, routesById) {
  if (!routeId) {
    return null;
  }

  const route = routesById.get(routeId);
  if (!route) {
    throw new Error(`Finding references unknown route: ${routeId}`);
  }

  return route.path === null ? null : `${route.method} ${route.path}`;
}

function validateCandidate(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Finding candidate must be an object.');
  }

  if (!candidate.sourceId || !candidate.sinkId || typeof candidate.evidence !== 'string' || !candidate.evidence.trim()) {
    throw new Error('Finding candidate requires sourceId, sinkId, and non-empty evidence.');
  }
}

function buildFindings(programModel, candidates, startIndex = 1) {
  if (!programModel) {
    return [];
  }

  const sourcesById = new Map(programModel.sources.map((source) => [source.id, source]));
  const sinksById = new Map(programModel.sinks.map((sink) => [sink.id, sink]));
  const routesById = new Map(programModel.routes.map((route) => [route.id, route]));
  const findings = [];
  const findingKeys = new Set();

  for (const candidate of candidates) {
    validateCandidate(candidate);
    const type = normalizeFindingType(candidate.type);
    const source = sourcesById.get(candidate.sourceId);
    const sink = sinksById.get(candidate.sinkId);
    if (!source || !sink) {
      throw new Error('Finding candidate sourceId and sinkId must reference Program Model entities.');
    }

    const key = `${type}\u0000${source.id}\u0000${sink.id}`;
    if (findingKeys.has(key)) {
      continue;
    }
    findingKeys.add(key);

    findings.push({
      id: formatFindingId(startIndex + findings.length),
      type,
      severity: normalizeSeverity(candidate.severity, type),
      title: FINDING_TYPES[type].title,
      file: sink.file,
      line: sink.line,
      source: source.expression,
      sink: sink.name,
      route: resolveRoute(candidate.routeId, routesById),
      evidence: candidate.evidence.trim()
    });
  }

  return findings;
}

module.exports = {
  buildFindings,
  buildOutput,
  normalizeFindingType,
  normalizeSeverity
};
