const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { validateProjectPath } = require('../scanner');
const { parseSource } = require('../parser');
const { extractRoutes } = require('../extractors/routeExtractor');
const { extractFunctions } = require('../extractors/functionExtractor');
const { extractSources } = require('../extractors/sourceExtractor');
const { extractSinks } = require('../extractors/sinkExtractor');
const { ProgramModel } = require('../model/programModel');
const { analyzeTaint } = require('../taint/taintAnalyzer');
const { evaluateSqlInjection } = require('../rules/sqlInjection');
const { evaluateCommandInjection } = require('../rules/commandInjection');
const { evaluateCodeExecution } = require('../rules/codeExecution');
const { buildOutput } = require('../output/findingBuilder');

test('foundation modules load and non-parser analysis modules remain inert', () => {
  assert.equal(parseSource('foundation.js', 'const ready = true;').ast.type, 'File');
  assert.deepEqual(extractRoutes(), []);
  assert.deepEqual(extractFunctions(), []);
  assert.deepEqual(extractSources(), []);
  assert.deepEqual(extractSinks(), []);
  assert.deepEqual(analyzeTaint(new ProgramModel({ name: 'empty', path: '/empty' })), { sinks: [] });
  assert.deepEqual(evaluateSqlInjection(), []);
  assert.deepEqual(evaluateCommandInjection(), []);
  assert.deepEqual(evaluateCodeExecution(), []);
});

test('project path validation accepts the bundled smoke-test project', () => {
  const result = validateProjectPath(path.join(__dirname, '..', 'test-project'));
  assert.equal(result.valid, true);
});

test('empty program model emits the Phase 1 output shape', () => {
  const output = buildOutput(new ProgramModel({ name: 'test-project', path: '/test-project' }));
  assert.equal(output.schemaVersion, '1.0');
  assert.deepEqual(output.findings, []);
  assert.deepEqual(output.summary, {
    filesAnalyzed: 0,
    routesFound: 0,
    functionsFound: 0,
    sourcesFound: 0,
    sinksFound: 0,
    findingsFound: 0
  });
});
