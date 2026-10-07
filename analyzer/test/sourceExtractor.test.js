const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { parseFile, parseSource } = require('../parser');
const { extractSources, extractSourcesFromParsedFiles } = require('../extractors/sourceExtractor');

const fixturePath = path.join(__dirname, 'fixtures', 'source-project', 'controller.js');

function extractFixtureSources() {
  return extractSources(parseFile(fixturePath, 'controllers/userController.js'));
}

test('extracts req.query, req.body, and req.params properties', () => {
  assert.deepEqual(extractFixtureSources().slice(0, 3), [
    {
      id: 'source_001',
      type: 'HTTP_INPUT',
      expression: 'req.query.id',
      file: 'controllers/userController.js',
      line: 1
    },
    {
      id: 'source_002',
      type: 'HTTP_INPUT',
      expression: 'req.body.name',
      file: 'controllers/userController.js',
      line: 2
    },
    {
      id: 'source_003',
      type: 'HTTP_INPUT',
      expression: 'req.params.id',
      file: 'controllers/userController.js',
      line: 3
    }
  ]);
});

test('extracts headers and cookies properties', () => {
  const sources = extractFixtureSources();
  assert.equal(sources[3].expression, 'req.headers.authorization');
  assert.equal(sources[3].line, 4);
  assert.equal(sources[4].expression, 'req.cookies.session');
  assert.equal(sources[4].line, 5);
});

test('extracts statically identifiable bracket notation deterministically', () => {
  const sources = extractFixtureSources();
  assert.equal(sources[5].expression, 'req.query["id"]');
  assert.equal(sources[5].line, 6);
  assert.equal(sources[8].expression, 'req.query["second"]');
  assert.equal(sources[8].line, 9);
});

test('extracts input used inside a nested expression', () => {
  const nestedSource = extractFixtureSources().find((source) => source.line === 7);
  assert.equal(nestedSource.expression, 'req.body.name');
});

test('does not treat arbitrary object.query access as Express input', () => {
  const sources = extractFixtureSources();
  assert.equal(sources.some((source) => source.expression === 'payload.query.id'), false);
  assert.equal(sources.length, 10);
});

test('extracts multiple sources in one file with unique scan-local IDs', () => {
  const sources = extractFixtureSources();
  assert.deepEqual(sources.map((source) => source.id), [
    'source_001', 'source_002', 'source_003', 'source_004', 'source_005',
    'source_006', 'source_007', 'source_008', 'source_009', 'source_010'
  ]);
  assert.equal(new Set(sources.map((source) => source.id)).size, sources.length);
  assert.equal(sources[7].expression, 'req.params.first');
});

test('supports optional chaining safely without treating dynamic keys as sources', () => {
  const parsedFile = parseSource(
    'optional.js',
    'const optional = req?.query?.id; const dynamic = req.body[fieldName];'
  );
  assert.deepEqual(extractSources(parsedFile).map((source) => source.expression), ['req.query.id']);
});

test('assigns source IDs uniquely across parsed files', () => {
  const parsedFiles = [
    parseSource('one.js', 'const one = req.query.one;'),
    parseSource('two.js', 'const two = req.body.two;')
  ];
  assert.deepEqual(extractSourcesFromParsedFiles(parsedFiles).map((source) => source.id), [
    'source_001', 'source_002'
  ]);
});
