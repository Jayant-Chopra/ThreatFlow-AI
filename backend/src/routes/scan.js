const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { analyzeProject, analyzeAttackGraph, buildGraphFromFindings } = require('../services/mockAnalyzer');
const { createProject, createScan, createFinding, getScanById, listFindingsByScanId } = require('../services/store');
const { getUploadRoot, extractUploadedProject } = require('../services/uploadService');

const DEFAULT_PROJECT_PATH = path.resolve(__dirname, '../../demo-vuln-app');

const router = express.Router();
const upload = multer({
  dest: getUploadRoot(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.zip', '.js', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext) || file.mimetype.startsWith('application/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Unsupported file type. Please upload a ZIP archive or project file.'));
  },
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ThreatFlow AI backend' });
});

router.post('/upload', upload.single('project'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No project file uploaded.' });
    }

    const projectName = req.body?.projectName || path.basename(req.file.originalname, path.extname(req.file.originalname));
    const extractedProject = extractUploadedProject(req.file, projectName);

    const project = createProject({
      name: projectName,
      uploadPath: extractedProject.projectPath,
    });

    const analyzerOutput = analyzeProject({ projectName, projectPath: extractedProject.projectPath });
    const graphResult = analyzeAttackGraph(analyzerOutput);

    const scan = createScan({
      projectId: project.id,
      status: 'completed',
      summary: `Scan completed for ${projectName}`,
      graph: graphResult.graph,
      attackPaths: graphResult.attackPaths,
      riskSummary: graphResult.riskSummary,
      chokepoints: graphResult.chokepoints,
      diagnostics: graphResult.diagnostics,
    });

    const findings = (analyzerOutput.findings || []).map((finding) =>
      createFinding({
        scanId: scan.id,
        type: finding.type,
        severity: finding.severity,
        file: finding.file,
        line: finding.line,
        source: finding.source,
        sink: finding.sink,
        route: finding.route || null,
        evidence: finding.evidence || null,
        title: finding.title || null,
      })
    );

    return res.status(201).json({
      message: 'Project uploaded and analyzed successfully.',
      projectId: project.id,
      projectName,
      projectPath: extractedProject.projectPath,
      scanId: scan.id,
      findings,
      graph: graphResult.graph,
      attackPaths: graphResult.attackPaths,
      riskSummary: graphResult.riskSummary,
      chokepoints: graphResult.chokepoints,
      diagnostics: graphResult.diagnostics,
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Upload and scan failed',
      message: error.message,
    });
  }
});

router.post('/scan', async (req, res) => {
  try {
    const projectName = req.body?.projectName || 'demo-project';
    const projectPath = req.body?.projectPath || DEFAULT_PROJECT_PATH;
    const analyzerOutput = req.body?.analyzerOutput || analyzeProject({ projectName, projectPath });
    const graphResult = analyzeAttackGraph(analyzerOutput);

    const project = createProject({
      name: projectName,
      uploadPath: projectPath,
    });

    const scan = createScan({
      projectId: project.id,
      status: 'completed',
      summary: `Scan completed for ${projectName}`,
      graph: graphResult.graph,
      attackPaths: graphResult.attackPaths,
      riskSummary: graphResult.riskSummary,
      chokepoints: graphResult.chokepoints,
      diagnostics: graphResult.diagnostics,
    });

    const findings = (analyzerOutput.findings || []).map((finding) =>
      createFinding({
        scanId: scan.id,
        type: finding.type,
        severity: finding.severity,
        file: finding.file,
        line: finding.line,
        source: finding.source,
        sink: finding.sink,
        route: finding.route || null,
        evidence: finding.evidence || null,
        title: finding.title || null,
      })
    );

    const graph = graphResult.graph || buildGraphFromFindings(findings);

    res.status(201).json({
      id: scan.id,
      projectId: project.id,
      status: scan.status,
      summary: scan.summary,
      findings,
      graph,
      attackPaths: graphResult.attackPaths,
      riskSummary: graphResult.riskSummary,
      chokepoints: graphResult.chokepoints,
      diagnostics: graphResult.diagnostics,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Scan failed',
      message: error.message,
    });
  }
});

router.get('/scans/:id', (req, res) => {
  const scan = getScanById(req.params.id);

  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  return res.json(scan);
});

router.get('/scans/:id/findings', (req, res) => {
  const findings = listFindingsByScanId(req.params.id);

  if (!findings.length) {
    return res.status(404).json({ error: 'No findings found for this scan' });
  }

  return res.json({ scanId: req.params.id, findings });
});

router.get('/scans/:id/graph', (req, res) => {
  const scan = getScanById(req.params.id);

  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  if (scan.graph) {
    return res.json(scan.graph);
  }

  const findings = listFindingsByScanId(req.params.id);
  if (!findings.length) {
    return res.status(404).json({ error: 'No graph data found for this scan' });
  }

  return res.json(buildGraphFromFindings(findings));
});

module.exports = router;
