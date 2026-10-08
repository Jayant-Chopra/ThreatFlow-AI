const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createUploadDirectory, getUploadRoot } = require('../src/services/uploadService');

test('upload service creates a project upload root', () => {
  const uploadRoot = getUploadRoot();
  assert.ok(uploadRoot.endsWith('/uploads') || uploadRoot.endsWith('uploads'));
  assert.ok(fs.existsSync(uploadRoot));

  const projectDir = createUploadDirectory('demo-project');
  assert.ok(fs.existsSync(projectDir));
  assert.match(path.basename(projectDir), /demo-project/);
});
