/**
 * @file chokepointEngine.js
 * @description Finds the code locations whose fix blocks the most attack paths.
 *
 * Method:
 *  - Candidates are the data-flow nodes of each path: SOURCE, VARIABLE, SINK.
 *    (Routes and handler functions are excluded: deleting a route is not a fix,
 *    and the analyzer gives no data to prove a middleware would block the input.)
 *  - Coverage of a node = the attack paths that pass through it.
 *  - Remediation plan = greedy set cover: repeatedly pick the node that blocks the
 *    most still-unblocked paths. Greedy is the standard approximation for set cover.
 *
 * Tie-breaks (deterministic): more paths, then more total risk, then
 * SINK > SOURCE > VARIABLE (fixing the sink is the most reliable injection fix),
 * then node ID.
 *
 * Limitation: each attack path is the shortest data-flow chain for its finding,
 * so "blocks" means "blocks the reported chain".
 *
 * @author Ravish Gupta <ravishgupta071@gmail.com>
 */

'use strict';

const { formatLocation } = require('./graphBuilder');

const FIXABLE_CATEGORIES = ['SINK', 'SOURCE', 'VARIABLE']; // order = tie-break preference

const SINK_ADVICE = {
  DATABASE: 'Use a parameterized query (bind user values as parameters, e.g. db.query("... WHERE id = ?", [id])) instead of building SQL with concatenation or template literals.',
  COMMAND_EXECUTION: 'Do not pass user input to a shell. Use execFile/spawn with a fixed command and an argument array, and allowlist the accepted values.',
  DANGEROUS_CODE_EXECUTION: 'Remove eval/Function on user input. Parse data with JSON.parse, or map the input to an allowlist of predefined operations.'
};

/**
 * Remediation advice for a chokepoint node.
 * @param {Object} entity
 * @param {Array<string>} vulnerabilityTypes types of the paths through this node
 * @returns {string}
 */
function remediationAdvice(entity, vulnerabilityTypes) {
  const where = formatLocation(entity) || entity.id;

  if (entity.entityCategory === 'SINK') {
    const advice = SINK_ADVICE[entity.type] || 'Replace this dangerous call with a safe API.';
    return `At ${where} (${entity.name}): ${advice}`;
  }

  const name = entity.entityCategory === 'SOURCE' ? entity.expression : entity.name;
  return `At ${where}: strictly validate "${name}" (allowlist or type conversion such as Number(...)) before it is used. ` +
    `This blocks the paths only if the validated value is safe for every downstream sink ` +
    `(${vulnerabilityTypes.join(', ')}); fixing each sink is still recommended.`;
}

/**
 * Coverage for every fixable node on at least one attack path.
 * @param {Array<Object>} attackPaths scored paths
 * @param {Map<string, Object>} entityMap
 */
function computeNodeCoverage(attackPaths, entityMap) {
  const coverage = new Map();

  for (const path of attackPaths) {
    for (const nodeId of path.nodeIds) {
      const entity = entityMap.get(nodeId);
      if (!entity || !FIXABLE_CATEGORIES.includes(entity.entityCategory)) continue;

      if (!coverage.has(nodeId)) coverage.set(nodeId, { entity, paths: new Map() });
      coverage.get(nodeId).paths.set(path.id, path);
    }
  }

  return coverage;
}

function compareCandidates(a, b) {
  return (
    b.count - a.count ||
    b.risk - a.risk ||
    FIXABLE_CATEGORIES.indexOf(a.entity.entityCategory) - FIXABLE_CATEGORIES.indexOf(b.entity.entityCategory) ||
    (a.entity.id < b.entity.id ? -1 : a.entity.id > b.entity.id ? 1 : 0)
  );
}

function describeCandidate(entity, paths) {
  const vulnerabilityTypes = [...new Set(paths.map((p) => p.vulnerabilityType))].sort();
  return {
    nodeId: entity.id,
    category: entity.entityCategory,
    label: entity.entityCategory === 'SOURCE' ? entity.expression : entity.name,
    file: entity.file ?? null,
    line: entity.line ?? null,
    location: formatLocation(entity),
    pathIds: paths.map((p) => p.id).sort(),
    pathsCovered: paths.length,
    riskCovered: paths.reduce((sum, p) => sum + (p.riskScore || 0), 0),
    vulnerabilityTypes,
    recommendation: remediationAdvice(entity, vulnerabilityTypes)
  };
}

/**
 * Ranked chokepoint candidates and a greedy remediation plan.
 * @param {Array<Object>} attackPaths scored paths
 * @param {Map<string, Object>} entityMap
 */
function analyzeChokepoints(attackPaths = [], entityMap) {
  const total = attackPaths.length;
  const coverage = computeNodeCoverage(attackPaths, entityMap);

  const candidates = [...coverage.values()]
    .map(({ entity, paths }) => {
      const list = [...paths.values()];
      return { entity, list, count: list.length, risk: list.reduce((s, p) => s + (p.riskScore || 0), 0) };
    })
    .sort(compareCandidates)
    .map(({ entity, list }) => describeCandidate(entity, list));

  // Greedy set cover over attack paths.
  const plan = [];
  const unblocked = new Set(attackPaths.map((p) => p.id));
  while (unblocked.size > 0) {
    let best = null;
    for (const { entity, paths } of coverage.values()) {
      const newly = [...paths.values()].filter((p) => unblocked.has(p.id));
      if (newly.length === 0) continue;
      const option = { entity, newly, count: newly.length, risk: newly.reduce((s, p) => s + (p.riskScore || 0), 0) };
      if (!best || compareCandidates(option, best) < 0) best = option;
    }
    if (!best) break; // a path with no fixable node (should not happen for analyzer findings)

    for (const p of best.newly) unblocked.delete(p.id);
    const blockedSoFar = total - unblocked.size;
    plan.push({
      step: plan.length + 1,
      ...describeCandidate(best.entity, [...coverage.get(best.entity.id).paths.values()]),
      newlyBlockedPathIds: best.newly.map((p) => p.id).sort(),
      cumulativeBlocked: blockedSoFar,
      cumulativePercent: Number(((blockedSoFar / total) * 100).toFixed(1))
    });
  }

  const primary = plan.length > 0
    ? { ...plan[0], isShared: plan[0].newlyBlockedPathIds.length > 1 }
    : null;

  return {
    primary,
    plan,
    candidates,
    summary: {
      totalPaths: total,
      fixesToBlockAllPaths: plan.length,
      hasSharedChokepoint: Boolean(primary && primary.isShared)
    }
  };
}

module.exports = {
  FIXABLE_CATEGORIES,
  SINK_ADVICE,
  remediationAdvice,
  computeNodeCoverage,
  analyzeChokepoints
};
