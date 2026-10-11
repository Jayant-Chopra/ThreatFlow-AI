const fs = require('node:fs');
const path = require('node:path');

const { analyzeProject: analyzeRealProject } = require('../../../analyzer/analyzer');
const { analyzeAttackGraph } = require('../../../graph-engine/src');

const REPO_ROOT = path.resolve(__dirname, '../../../');
const DEFAULT_PROJECT_PATH = path.resolve(__dirname, '../../demo-vuln-app');

function resolvePath(targetPath) {
  if (!targetPath) return DEFAULT_PROJECT_PATH;
  if (path.isAbsolute(targetPath) && fs.existsSync(targetPath)) return targetPath;
  const inCwd = path.resolve(process.cwd(), targetPath);
  if (fs.existsSync(inCwd)) return inCwd;
  const inRepo = path.resolve(REPO_ROOT, targetPath);
  if (fs.existsSync(inRepo)) return inRepo;
  return targetPath;
}

function normalizeProjectInput(input) {
  if (typeof input === 'string') {
    return { projectPath: resolvePath(input), workingDirectory: process.cwd() };
  }

  if (input && typeof input === 'object') {
    const rawPath = input.projectPath || input.path || DEFAULT_PROJECT_PATH;
    return {
      projectPath: resolvePath(rawPath),
      workingDirectory: input.workingDirectory || process.cwd(),
    };
  }

  return { projectPath: DEFAULT_PROJECT_PATH, workingDirectory: process.cwd() };
}

function analyzeProject(input) {
  const options = normalizeProjectInput(input);
  return analyzeRealProject(options.projectPath, options.workingDirectory);
}

function buildGraphFromFindings(findings) {
  if (!Array.isArray(findings) || findings.length === 0) {
    return { nodes: [], edges: [] };
  }

  const nodes = [
    { id: 'entry:internet', label: 'Internet', type: 'entrypoint' },
    { id: 'node:public-api', label: 'Public API', type: 'api' },
  ];

  const edges = [{ from: 'entry:internet', to: 'node:public-api', label: 'HTTP Request' }];

  findings.forEach((finding, index) => {
    const vulnNodeId = `finding:${finding.id || index}`;
    nodes.push({
      id: vulnNodeId,
      label: finding.type || 'VULNERABILITY',
      type: 'vulnerability',
      severity: finding.severity || 'MEDIUM',
      file: finding.file,
      line: finding.line,
    });

    edges.push({
      from: 'node:public-api',
      to: vulnNodeId,
      label: finding.route || 'route-handler',
    });

    const sinkNodeId = `sink:${index}`;
    nodes.push({
      id: sinkNodeId,
      label: finding.sink || 'sensitive-sink',
      type: 'resource',
    });

    edges.push({
      from: vulnNodeId,
      to: sinkNodeId,
      label: 'reaches sensitive sink',
    });
  });

  return { nodes, edges };
}

function buildGraphForAnalyzerOutput(analyzerOutput) {
  if (!analyzerOutput || !Array.isArray(analyzerOutput.findings)) {
    return {
      graph: { nodes: [], edges: [] },
      attackPaths: [],
      chokepoints: { primary: null, plan: [], summary: { totalPaths: 0, fixesToBlockAllPaths: 0, hasSharedChokepoint: false } },
      riskSummary: { totalPaths: 0, maxRiskScore: 0, maxScore: 0, overallPosture: 'LOW', distribution: { critical: 0, high: 0, medium: 0, low: 0 } },
      diagnostics: { unresolvedFindings: [], droppedRelationships: [] },
    };
  }

  return analyzeAttackGraph(analyzerOutput);
}

module.exports = {
  analyzeProject,
  analyzeAttackGraph: buildGraphForAnalyzerOutput,
  buildGraphFromFindings,
};
