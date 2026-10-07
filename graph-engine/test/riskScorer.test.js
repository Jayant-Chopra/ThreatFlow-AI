'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { scoreAttackPath, scoreAllPaths, categorizeRiskLevel } = require('../src/riskScorer');

function createPathCandidate(id, vulnerabilityType, routeResolved, sourceType = 'HTTP_INPUT') {
  return { id, vulnerabilityType, routeResolved, source: { type: sourceType } };
}

test('score = impact x exposure, using only the documented table', () => {
  const cases = [
    ['CODE_EXECUTION', true, 9, 'CRITICAL'],
    ['COMMAND_INJECTION', true, 9, 'CRITICAL'],
    ['SQL_INJECTION', true, 6, 'HIGH'],
    ['CODE_EXECUTION', false, 6, 'HIGH'],
    ['SQL_INJECTION', false, 4, 'MEDIUM'],
    ['UNKNOWN_TYPE', true, 3, 'MEDIUM']
  ];
  for (const [type, routeResolved, score, level] of cases) {
    const scored = scoreAttackPath(createPathCandidate('P', type, routeResolved));
    assert.equal(scored.riskScore, score, `${type} route=${routeResolved}`);
    assert.equal(scored.riskLevel, level, `${type} route=${routeResolved}`);
    assert.equal(scored.riskMetrics.score, scored.riskMetrics.impact * scored.riskMetrics.exposure);
  }
});

test('non-HTTP input without a route gets the lowest exposure', () => {
  assert.equal(scoreAttackPath(createPathCandidate('P', 'SQL_INJECTION', false, 'OTHER')).riskScore, 2);
});

test('level boundaries', () => {
  assert.equal(categorizeRiskLevel(9), 'CRITICAL');
  assert.equal(categorizeRiskLevel(6), 'HIGH');
  assert.equal(categorizeRiskLevel(3), 'MEDIUM');
  assert.equal(categorizeRiskLevel(2), 'LOW');
});

test('paths are sorted by score, ties by ID, and summarized', () => {
  const { scoredPaths, summary } = scoreAllPaths([
    createPathCandidate('PATH-001', 'SQL_INJECTION', true),
    createPathCandidate('PATH-003', 'CODE_EXECUTION', true),
    createPathCandidate('PATH-002', 'COMMAND_INJECTION', true)
  ]);
  assert.deepEqual(scoredPaths.map((p) => p.id), ['PATH-002', 'PATH-003', 'PATH-001']);
  assert.deepEqual(summary.distribution, { critical: 2, high: 1, medium: 0, low: 0 });
  assert.equal(summary.overallPosture, 'CRITICAL');
});

test('no paths gives posture NONE', () => {
  assert.equal(scoreAllPaths([]).summary.overallPosture, 'NONE');
});
