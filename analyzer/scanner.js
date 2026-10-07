const fs = require('node:fs');
const path = require('node:path');

const IGNORED_DIRECTORY_NAMES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'generated',
  'vendor'
]);

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function validateProjectPath(projectPath, workingDirectory = process.cwd()) {
  if (!projectPath) {
    return { valid: false, message: 'A project path is required.' };
  }

  const resolvedPath = path.resolve(workingDirectory, projectPath);
  if (!fs.existsSync(resolvedPath)) {
    return { valid: false, message: `Project path does not exist: ${resolvedPath}` };
  }

  if (!fs.statSync(resolvedPath).isDirectory()) {
    return { valid: false, message: `Project path is not a directory: ${resolvedPath}` };
  }

  return { valid: true, path: resolvedPath };
}

function scanProject(projectPath, workingDirectory = process.cwd()) {
  const validation = validateProjectPath(projectPath, workingDirectory);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const files = [];
  const discoveredPaths = new Set();

  function visitDirectory(directoryPath) {
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORY_NAMES.has(entry.name.toLowerCase())) {
          visitDirectory(entryPath);
        }
        continue;
      }

      if (!entry.isFile() || path.extname(entry.name) !== '.js') {
        continue;
      }

      const relativePath = normalizePath(path.relative(validation.path, entryPath));
      if (!discoveredPaths.has(relativePath)) {
        discoveredPaths.add(relativePath);
        files.push({ path: relativePath, extension: '.js' });
      }
    }
  }

  visitDirectory(validation.path);

  return {
    projectPath: normalizePath(validation.path),
    files
  };
}

function main(argumentsList = process.argv.slice(2)) {
  const verbose = argumentsList.includes('--verbose');
  const projectPath = argumentsList.find((argument) => argument !== '--verbose');

  try {
    const { analyzeProjectWithDiagnostics } = require('./analyzer');
    const result = analyzeProjectWithDiagnostics(projectPath);
    process.stdout.write(`${JSON.stringify(result.output, null, 2)}\n`);

    if (verbose) {
      for (const parseError of result.parseErrors) {
        process.stderr.write(`${parseError.file}: ${parseError.error.type}: ${parseError.error.message}\n`);
      }
    }
  } catch (error) {
    console.error(error.message);
    return 1;
  }

  return 0;
}

module.exports = {
  IGNORED_DIRECTORY_NAMES,
  main,
  normalizePath,
  scanProject,
  validateProjectPath
};

if (require.main === module) {
  process.exitCode = main();
}
