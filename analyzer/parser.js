const fs = require('node:fs');
const path = require('node:path');
const babelParser = require('@babel/parser');

const PARSER_OPTIONS = Object.freeze({
  allowAwaitOutsideFunction: true,
  errorRecovery: false,
  plugins: ['dynamicImport', 'importMeta', 'topLevelAwait'],
  ranges: true,
  sourceType: 'unambiguous'
});

function normalizeFilePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function buildParseError(file, source, error) {
  const parseError = {
    type: 'PARSE_ERROR',
    message: error.message
  };

  if (error.loc) {
    parseError.line = error.loc.line;
    parseError.column = error.loc.column;
  }

  return { file, source, error: parseError };
}

function parseSource(file, source) {
  const normalizedFile = normalizeFilePath(file);

  try {
    return {
      file: normalizedFile,
      source,
      ast: babelParser.parse(source, {
        ...PARSER_OPTIONS,
        sourceFilename: normalizedFile
      })
    };
  } catch (error) {
    return buildParseError(normalizedFile, source, error);
  }
}

function parseFile(filePath, displayPath = filePath) {
  const normalizedFile = normalizeFilePath(displayPath);
  let source;

  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return {
      file: normalizedFile,
      error: {
        type: 'READ_ERROR',
        message: error.message
      }
    };
  }

  return parseSource(normalizedFile, source);
}

function parseDiscoveredFiles(scanResult) {
  return scanResult.files.map((file) => {
    const absolutePath = path.resolve(scanResult.projectPath, file.path);
    return parseFile(absolutePath, file.path);
  });
}

module.exports = {
  PARSER_OPTIONS,
  parseDiscoveredFiles,
  parseFile,
  parseSource
};
