const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { parseDiscoveredFiles } = require('../parser');
const { scanProject } = require('../scanner');
const { analyzeProject } = require('../analyzer');

const projectPath = path.join(__dirname, '..', 'test-project');

function findEntity(entities, predicate) {
  const entity = entities.find(predicate);
  assert.ok(entity, 'Expected analyzer entity was not found.');
  return entity;
}

test('realistic test project parses and produces only its three natural vulnerable findings', () => {
  const scan = scanProject(projectPath);
  const parsedFiles = parseDiscoveredFiles(scan);
  const output = analyzeProject(projectPath);

  assert.equal(parsedFiles.every((parsedFile) => parsedFile.ast && !parsedFile.error), true);
  assert.deepEqual(scan.files.map((file) => file.path), [
    'app.js',
    'controllers/userController.js',
    'routes/userRoutes.js',
    'safe/safeExamples.js'
  ]);
  assert.equal(output.summary.filesAnalyzed, 4);
  assert.equal(output.summary.routesFound, output.routes.length);
  assert.equal(output.summary.functionsFound, output.functions.length);
  assert.equal(output.summary.sourcesFound, output.sources.length);
  assert.equal(output.summary.sinksFound, output.sinks.length);
  assert.equal(output.summary.findingsFound, output.findings.length);
  assert.deepEqual(output.findings.map((finding) => ({ type: finding.type, line: finding.line })), [
    { type: 'SQL_INJECTION', line: 14 },
    { type: 'COMMAND_INJECTION', line: 21 },
    { type: 'CODE_EXECUTION', line: 27 }
  ]);
  assert.deepEqual(output.findings.map((finding) => finding.route), [
    'GET /users',
    'GET /diagnostic',
    'POST /execute'
  ]);
});

test('vulnerable source-to-sink relationships match the fixture source lines', () => {
  const output = analyzeProject(projectPath);
  const sqlSource = findEntity(output.sources, (source) => (
    source.file === 'controllers/userController.js' && source.expression === 'req.query.id' && source.line === 12
  ));
  const commandSource = findEntity(output.sources, (source) => (
    source.file === 'controllers/userController.js' && source.expression === 'req.query.host' && source.line === 19
  ));
  const codeSource = findEntity(output.sources, (source) => (
    source.file === 'controllers/userController.js' && source.expression === 'req.body.code' && source.line === 26
  ));
  const sqlSink = findEntity(output.sinks, (sink) => sink.file === 'controllers/userController.js' && sink.line === 14);
  const commandSink = findEntity(output.sinks, (sink) => sink.file === 'controllers/userController.js' && sink.line === 21);
  const codeSink = findEntity(output.sinks, (sink) => sink.file === 'controllers/userController.js' && sink.line === 27);

  for (const [source, sink] of [[sqlSource, sqlSink], [commandSource, commandSink], [codeSource, codeSink]]) {
    assert.ok(output.findings.some((finding) => finding.source === source.expression && finding.sink === sink.name));
    assert.ok(output.relationships.some((relationship) => relationship.from === source.id));
    assert.ok(output.relationships.some((relationship) => relationship.to === sink.id));
  }
});

test('safe examples contribute sources and sinks without contributing matching findings', () => {
  const output = analyzeProject(projectPath);
  assert.ok(output.sources.some((source) => source.file === 'safe/safeExamples.js' && source.expression === 'req.query.id'));
  assert.ok(output.sinks.some((sink) => sink.file === 'safe/safeExamples.js' && sink.name === 'db.query'));
  assert.ok(output.sinks.some((sink) => sink.file === 'safe/safeExamples.js' && sink.name === 'exec'));
  assert.equal(output.findings.some((finding) => finding.file === 'safe/safeExamples.js'), false);
  assert.equal(output.findings.some((finding) => finding.sink === 'formatValue'), false);
});
