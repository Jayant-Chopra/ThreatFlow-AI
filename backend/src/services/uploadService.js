const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');

function getUploadRoot() {
  const root = path.resolve(process.cwd(), 'uploads');
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function sanitizeProjectName(name) {
  return String(name || 'project')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'project';
}

function createUploadDirectory(projectName) {
  const safeName = sanitizeProjectName(projectName);
  const uploadRoot = getUploadRoot();
  const targetDir = path.join(uploadRoot, `${safeName}-${Date.now()}`);
  fs.mkdirSync(targetDir, { recursive: true });
  return targetDir;
}

function extractUploadedProject(file, projectName) {
  if (!file || !file.path) {
    throw new Error('No uploaded file was provided.');
  }

  const uploadRoot = getUploadRoot();
  const safeName = sanitizeProjectName(projectName || file.originalname || 'project');
  const targetDir = path.join(uploadRoot, `${safeName}-${Date.now()}`);

  const ext = path.extname(file.originalname || '').toLowerCase();

  if (ext === '.zip') {
    const zip = new AdmZip(file.path);
    fs.mkdirSync(targetDir, { recursive: true });
    zip.extractAllTo(targetDir, true);
    fs.unlinkSync(file.path);
    return {
      projectName: safeName,
      projectPath: targetDir,
      originalName: file.originalname,
    };
  }

  fs.mkdirSync(targetDir, { recursive: true });
  const destinationPath = path.join(targetDir, file.originalname || 'project-file');
  fs.copyFileSync(file.path, destinationPath);
  fs.unlinkSync(file.path);

  return {
    projectName: safeName,
    projectPath: targetDir,
    originalName: file.originalname,
  };
}

module.exports = {
  getUploadRoot,
  sanitizeProjectName,
  createUploadDirectory,
  extractUploadedProject,
};
