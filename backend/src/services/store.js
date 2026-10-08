const state = {
  projects: [],
  scans: [],
  findings: [],
};

const makeId = () => Math.random().toString(36).slice(2, 11);

function createProject({ name, uploadPath = null }) {
  const project = {
    id: makeId(),
    name,
    uploadPath,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.projects.push(project);
  return project;
}

function createScan({
  projectId,
  status = 'queued',
  summary = null,
  graph = null,
  attackPaths = null,
  riskSummary = null,
  chokepoints = null,
  diagnostics = null,
}) {
  const scan = {
    id: makeId(),
    projectId,
    status,
    summary,
    graph,
    attackPaths,
    riskSummary,
    chokepoints,
    diagnostics,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.scans.push(scan);
  return scan;
}

function createFinding({ scanId, type, severity, file, line, source, sink, route = null, evidence = null, title = null }) {
  const finding = {
    id: makeId(),
    scanId,
    type,
    severity,
    file,
    line,
    source,
    sink,
    route,
    evidence,
    title,
    createdAt: new Date().toISOString(),
  };

  state.findings.push(finding);
  return finding;
}

function getScanById(scanId) {
  return state.scans.find((scan) => scan.id === scanId);
}

function listFindingsByScanId(scanId) {
  return state.findings.filter((finding) => finding.scanId === scanId);
}

module.exports = {
  state,
  createProject,
  createScan,
  createFinding,
  getScanById,
  listFindingsByScanId,
};
