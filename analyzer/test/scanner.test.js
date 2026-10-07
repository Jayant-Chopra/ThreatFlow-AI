const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { scanProject } = require('../scanner');

const scannerFixturePath = path.join(__dirname, 'fixtures', 'scanner-project');
const emptyProjectPath = path.join(__dirname, 'fixtures', 'empty-project');
const expectedPaths = ['app.js', 'lib/nested.js', 'routes/user.js'];

function scanFixture() {
  return scanProject(scannerFixturePath);
}

test('discovers a root-level .js file', () => {
  assert.ok(scanFixture().files.some((file) => file.path === 'app.js'));
});

test('discovers a nested .js file', () => {
  assert.ok(scanFixture().files.some((file) => file.path === 'routes/user.js'));
});

test('does not traverse node_modules', () => {
  assert.ok(!scanFixture().files.some((file) => file.path.includes('node_modules')));
});

test('does not traverse dist or build', () => {
  const paths = scanFixture().files.map((file) => file.path);
  assert.ok(!paths.some((filePath) => filePath.startsWith('dist/') || filePath.startsWith('build/')));
});

test('excludes non-JavaScript files', () => {
  const paths = scanFixture().files.map((file) => file.path);
  assert.ok(!paths.includes('README.md'));
  assert.ok(!paths.includes('assets/logo.png'));
});

test('returns no files for a project with no JavaScript source', () => {
  assert.deepEqual(scanProject(emptyProjectPath).files, []);
});

test('rejects an invalid project path', () => {
  assert.throws(() => scanProject(path.join(scannerFixturePath, 'does-not-exist')), /does not exist/);
});

test('returns sorted, unique, slash-normalized relative paths', () => {
  const result = scanFixture();
  const paths = result.files.map((file) => file.path);
  assert.deepEqual(paths, expectedPaths);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.every((filePath) => !filePath.includes('\\')));
  assert.ok(result.files.every((file) => file.extension === '.js'));
});

test('does not traverse generated, vendor, or coverage directories', () => {
  const paths = scanFixture().files.map((file) => file.path);
  assert.ok(!paths.some((filePath) => /^(generated|vendor|coverage)\//.test(filePath)));
});
