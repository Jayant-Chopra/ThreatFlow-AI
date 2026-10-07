/**
 * @file riskScorer.js
 * @description Ranks attack paths with a small, documented risk matrix:
 *
 *     risk score = impact (1-3) x exposure (1-3)        -> 1..9
 *
 * This is the "likelihood x impact" idea from the OWASP Risk Rating
 * Methodology, simplified for Evaluation 1. The weights below are team-chosen
 * and are the only numbers used. They are listed in IMPACT_BY_TYPE and
 * EXPOSURE_RULES; nothing else affects the score.
 *
 * Not modelled yet (no analyzer data for it): authentication middleware,
 * input validation, deployment exposure. A score is a ranking aid, not proof.
 *
 * @author Ravish Gupta <ravishgupta071@gmail.com>
 */

'use strict';

/** Impact by analyzer vulnerability type. */
const IMPACT_BY_TYPE = {
  CODE_EXECUTION: { value: 3, reason: 'User input is executed as JavaScript on the server (remote code execution).' },
  COMMAND_INJECTION: { value: 3, reason: 'User input reaches an OS command (remote command execution).' },
  SQL_INJECTION: { value: 2, reason: 'User input changes a database query (data read/modify), not direct server execution.' }
};
const UNKNOWN_IMPACT = { value: 1, reason: 'Vulnerability type is not in the Evaluation 1 impact table.' };

/** Exposure (likelihood proxy) from what the analyzer could resolve. */
const EXPOSURE_RULES = {
  ROUTE: { value: 3, reason: 'Input comes from an HTTP request on a resolved Express route.' },
  HTTP_INPUT_NO_ROUTE: { value: 2, reason: 'Input is HTTP request data, but no route could be resolved.' },
  OTHER: { value: 1, reason: 'Input is not a recognized HTTP request source.' }
};

const MAX_SCORE = 9;

/**
 * Maps a 1..9 score to a level.
 * @param {number} score
 * @returns {'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'}
 */
function categorizeRiskLevel(score) {
  if (score >= 9) return 'CRITICAL';
  if (score >= 6) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  return 'LOW';
}

/**
 * @param {Object} attackPath
 */
function getImpact(attackPath) {
  return IMPACT_BY_TYPE[attackPath.vulnerabilityType] || UNKNOWN_IMPACT;
}

/**
 * @param {Object} attackPath
 */
function getExposure(attackPath) {
  if (attackPath.routeResolved) return EXPOSURE_RULES.ROUTE;
  if (attackPath.source && attackPath.source.type === 'HTTP_INPUT') return EXPOSURE_RULES.HTTP_INPUT_NO_ROUTE;
  return EXPOSURE_RULES.OTHER;
}

/**
 * Adds riskScore, riskLevel and the full breakdown to an attack path.
 * @param {Object} attackPath
 * @returns {Object}
 */
function scoreAttackPath(attackPath) {
  const impact = getImpact(attackPath);
  const exposure = getExposure(attackPath);
  const riskScore = impact.value * exposure.value;
  const riskLevel = categorizeRiskLevel(riskScore);

  return {
    ...attackPath,
    riskScore,
    riskLevel,
    riskMetrics: {
      impact: impact.value,
      impactReason: impact.reason,
      exposure: exposure.value,
      exposureReason: exposure.reason,
      score: riskScore,
      maxScore: MAX_SCORE,
      level: riskLevel,
      formula: 'impact (1-3) x exposure (1-3)'
    }
  };
}

/**
 * Scores all paths and sorts them: highest score first, then by path ID.
 * @param {Array<Object>} attackPaths
 */
function scoreAllPaths(attackPaths = []) {
  const scoredPaths = attackPaths.map(scoreAttackPath);
  scoredPaths.sort((a, b) => b.riskScore - a.riskScore || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const distribution = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const p of scoredPaths) distribution[p.riskLevel.toLowerCase()] += 1;

  const maxRiskScore = scoredPaths.length > 0 ? scoredPaths[0].riskScore : 0;

  return {
    scoredPaths,
    summary: {
      totalPaths: scoredPaths.length,
      maxRiskScore,
      maxScore: MAX_SCORE,
      overallPosture: scoredPaths.length > 0 ? categorizeRiskLevel(maxRiskScore) : 'NONE',
      distribution
    }
  };
}

module.exports = {
  IMPACT_BY_TYPE,
  EXPOSURE_RULES,
  MAX_SCORE,
  categorizeRiskLevel,
  scoreAttackPath,
  scoreAllPaths
};
