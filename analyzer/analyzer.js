const path = require('node:path');

const { scanProject } = require('./scanner');
const { parseDiscoveredFiles } = require('./parser');
const { buildProgramModel } = require('./model/programModel');
const { analyzeTaint } = require('./taint/taintAnalyzer');
const { buildFindings } = require('./output/findingBuilder');
const { collectSqlInjectionCandidates } = require('./rules/sqlInjection');
const { collectCommandInjectionCandidates } = require('./rules/commandInjection');
const { collectCodeExecutionCandidates } = require('./rules/codeExecution');

function buildProjectIdentity(scanResult) {
  return {
    name: path.basename(scanResult.projectPath),
    path: scanResult.projectPath
  };
}

function collectFindingCandidates(programModel, taintResult) {
  return [
    ...collectSqlInjectionCandidates(programModel, taintResult),
    ...collectCommandInjectionCandidates(programModel, taintResult),
    ...collectCodeExecutionCandidates(programModel, taintResult)
  ];
}

function analyzeProjectWithDiagnostics(projectPath, workingDirectory = process.cwd()) {
  const scanResult = scanProject(projectPath, workingDirectory);
  const parsedFiles = parseDiscoveredFiles(scanResult);
  const programModel = buildProgramModel(parsedFiles, buildProjectIdentity(scanResult));
  const taintResult = analyzeTaint(programModel);
  programModel.findings = buildFindings(
    programModel,
    collectFindingCandidates(programModel, taintResult)
  );

  return {
    output: programModel.toOutput(),
    parseErrors: parsedFiles
      .filter((parsedFile) => parsedFile.error)
      .map((parsedFile) => ({ file: parsedFile.file, error: parsedFile.error }))
  };
}

function analyzeProject(projectPath, workingDirectory = process.cwd()) {
  return analyzeProjectWithDiagnostics(projectPath, workingDirectory).output;
}

module.exports = {
  analyzeProject,
  analyzeProjectWithDiagnostics,
  collectFindingCandidates
};
