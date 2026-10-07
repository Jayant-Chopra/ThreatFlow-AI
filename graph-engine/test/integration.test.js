'use strict';

/**
 * Integration tests on REAL analyzer output (no hand-written data):
 *  - fixtures/analyzer-output-example.json: Lakshay's published example (single file).
 *  - test/fixtures/test-project-output.json: snapshot of
 *      analyzeProject('./test-project') from analyzer/ (4 files, 7 routes, safe examples).
 *    Regenerate from the analyzer directory with:
 *      node -e "const o=require('./analyzer').analyzeProject('./test-project');o.project.path='analyzer/test-project';require('fs').writeFileSync('../graph-engine/test/fixtures/test-project-output.json',JSON.stringify(o,null,2)+'\n')"
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { analyzeAttackGraph } = require('../src');

const example = require(path.resolve(__dirname, '../../fixtures/analyzer-output-example.json'));
const testProject = require('./fixtures/test-project-output.json');

function pathFor(result, findingId) {
  return result.attackPaths.find((p) => p.findingId === findingId);
}

function assertEveryHopIsAnEdge(result) {
  const edges = new Set(result.graph.edges.map((e) => `${e.source}>${e.target}`));
  for (const p of result.attackPaths) {
    for (let i = 1; i < p.nodeIds.length; i += 1) {
      assert.ok(edges.has(`${p.nodeIds[i - 1]}>${p.nodeIds[i]}`), `${p.id}: missing edge ${p.nodeIds[i - 1]} -> ${p.nodeIds[i]}`);
    }
  }
}

test('test-project: exactly one attack path per analyzer finding', () => {
  const result = analyzeAttackGraph(testProject);
  assert.equal(testProject.findings.length, 3);
  assert.equal(result.attackPaths.length, 3);
  assert.deepEqual(result.attackPaths.map((p) => p.findingId).sort(), ['finding_001', 'finding_002', 'finding_003']);
  assert.equal(result.diagnostics.unresolvedFindings.length, 0);
});

test('test-project: safe examples (incl. parameterized query) produce no attack path', () => {
  const result = analyzeAttackGraph(testProject);
  for (const p of result.attackPaths) {
    for (const step of p.steps) assert.notEqual(step.file, 'safe/safeExamples.js', `${p.id} touches safe code`);
  }
  const safeQuerySink = result.graph.nodes.find((n) => n.data.location === 'safe/safeExamples.js:17');
  assert.equal(safeQuerySink.data.isVulnerable, false);
  assert.equal(safeQuerySink.data.onAttackPath, false);
});

test('test-project: routes in routes/ are linked to handlers in controllers/', () => {
  const result = analyzeAttackGraph(testProject);
  assert.deepEqual(pathFor(result, 'finding_001').nodeIds, ['route_001', 'func_005', 'source_001', 'var_004', 'var_005', 'sink_001']);
  assert.deepEqual(pathFor(result, 'finding_002').nodeIds, ['route_002', 'func_006', 'source_002', 'var_006', 'var_007', 'sink_002']);
  assert.deepEqual(pathFor(result, 'finding_003').nodeIds, ['route_003', 'func_007', 'source_003', 'var_008', 'sink_003']);
  for (const p of result.attackPaths) {
    const finding = testProject.findings.find((f) => f.id === p.findingId);
    assert.equal(`${p.route.method} ${p.route.path}`, finding.route);
  }
});

test('test-project: every attack-path hop exists as an edge in the rendered graph', () => {
  const result = analyzeAttackGraph(testProject);
  assertEveryHopIsAnEdge(result);
  // 19 analyzer relationships + 3 derived handler->source edges.
  assert.equal(result.graph.edges.length, 22);
  assert.equal(result.summary.derivedEdges, 3);
  assert.equal(result.graph.nodes.length, 52);
});

test('test-project: risk ranking and remediation plan', () => {
  const result = analyzeAttackGraph(testProject);
  assert.deepEqual(
    result.attackPaths.map((p) => [p.findingId, p.riskScore, p.riskLevel]),
    [['finding_002', 9, 'CRITICAL'], ['finding_003', 9, 'CRITICAL'], ['finding_001', 6, 'HIGH']]
  );
  // The three paths share no fixable node, so three separate fixes are needed.
  assert.equal(result.chokepoints.summary.hasSharedChokepoint, false);
  assert.deepEqual(result.chokepoints.plan.map((s) => s.nodeId), ['sink_002', 'sink_003', 'sink_001']);
});

test('test-project: graph positions do not overlap', () => {
  const result = analyzeAttackGraph(testProject);
  const seen = new Set();
  for (const n of result.graph.nodes) {
    const key = `${n.position.x},${n.position.y}`;
    assert.ok(!seen.has(key), `overlap at ${key}`);
    seen.add(key);
  }
});

test("Lakshay's published example: three paths through the single route", () => {
  const result = analyzeAttackGraph(example);
  assert.equal(result.attackPaths.length, 3);
  assert.deepEqual(pathFor(result, 'finding_001').nodeIds, ['route_001', 'func_001', 'source_001', 'var_001', 'var_002', 'sink_001']);
  assertEveryHopIsAnEdge(result);
  // The route and handler are shared, but they are not fixes; the sinks are.
  assert.equal(result.chokepoints.primary.category, 'SINK');
});

test('analyzer input is not mutated', () => {
  const copy = JSON.parse(JSON.stringify(testProject));
  analyzeAttackGraph(testProject);
  assert.deepEqual(testProject, copy);
});
