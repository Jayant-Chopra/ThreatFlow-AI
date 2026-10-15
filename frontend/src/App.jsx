import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  Activity,
  Radio,
  Server,
  LayoutDashboard,
  GitGraph,
  ShieldCheck,
  ListFilter,
  Play,
  Upload,
  Zap,
  Globe,
  AlertTriangle,
  Target,
  AlertOctagon,
  RotateCcw,
} from 'lucide-react';
import { checkBackendHealth, scanProject, uploadAndScan } from './services/api';
import { AttackGraphCanvas } from './components/AttackGraphCanvas';
import { AttackStoryFlow } from './components/AttackStoryFlow';
import { AttackPathsPanel } from './components/AttackPathsPanel';
import { ChokepointPanel } from './components/ChokepointPanel';
import { CodePatchView } from './components/CodePatchView';
import { FindingsTableView } from './components/FindingsTableView';
import { NodeDetailsDrawer } from './components/NodeDetailsDrawer';

export function App() {
  const [activeTab, setActiveTab] = useState('story'); // 'story', 'graph', 'patch', 'table'
  const [scanData, setScanData] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [activePathId, setActivePathId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [activeTarget, setActiveTarget] = useState('test-project');
  const fileInputRef = useRef(null);

  const executeScan = useCallback(async (target) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);

      let projectPath = '../analyzer/test-project';
      let projectName = 'Express AST Test Suite';

      if (target === 'demo-vuln-app') {
        // Pointing directly to backend/demo-vuln-app
        projectPath = 'demo-vuln-app';
        projectName = 'Demo Vulnerable App';
      } else if (target === 'pipeline-safe') {
        // Safe clean project
        projectPath = '../analyzer/test-project/safe';
        projectName = 'Safe Clean Pipeline';
      } else if (target === 'test-project' || target === 'pipeline-vulnerable') {
        projectPath = '../analyzer/test-project';
        projectName = 'Express AST Test Suite';
      }

      const result = await scanProject(projectName, projectPath);
      if (result?.data) {
        setScanData(result.data);
        setScanError(null);
        if (result.data.attackPaths?.length > 0) {
          setActivePathId(result.data.attackPaths[0].id);
        } else {
          setActivePathId(null);
        }
      }
    } catch (err) {
      console.error('Scan execution error:', err);
      setScanError(err.message || 'Scan failed. Could not retrieve analysis from backend.');
      setScanData(null);
      setActivePathId(null);
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      setIsScanning(true);
      setScanError(null);
      try {
        const isOnline = await checkBackendHealth();
        if (isMounted) setBackendOnline(isOnline);
        const result = await scanProject('Express AST Test Suite', '../analyzer/test-project');
        if (isMounted && result?.data) {
          setScanData(result.data);
          setScanError(null);
          if (result.data.attackPaths?.length > 0) {
            setActivePathId(result.data.attackPaths[0].id);
          }
        }
      } catch (err) {
        console.error('Initial scan error:', err);
        if (isMounted) {
          setScanError(err.message || 'Failed to connect to backend on startup.');
          setScanData(null);
        }
      } finally {
        if (isMounted) setIsScanning(false);
      }
    };
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanError(null);
    try {
      const result = await uploadAndScan(file, file.name.replace(/\.[^/.]+$/, ''));
      setScanData(result.data);
      setScanError(null);
      if (result.data.attackPaths?.length > 0) {
        setActivePathId(result.data.attackPaths[0].id);
      } else {
        setActivePathId(null);
      }
    } catch (err) {
      console.error('Upload scan error:', err);
      setScanError(err.message || 'Upload scan failed.');
      setScanData(null);
    } finally {
      setIsScanning(false);
    }
  };

  const riskSummary = scanData?.riskSummary || {
    overallPosture: scanData?.attackPaths?.length === 0 ? 'SAFE' : 'CRITICAL',
    maxRiskScore: scanData?.attackPaths?.length === 0 ? 0 : 9,
    totalPaths: scanData?.attackPaths?.length || 0,
  };

  const routeNodesCount = (scanData?.graph?.nodes || []).filter(
    (n) => n.data?.category === 'ROUTE' || n.type === 'routeNode'
  ).length || 0;

  const chokepointsCount = scanData?.chokepoints?.summary?.fixesToBlockAllPaths ||
    (scanData?.chokepoints?.primary ? 1 : 0);

  const isCleanProject = scanData && (scanData.attackPaths?.length === 0);

  return (
    <div className="app-container" style={{ background: '#090d16', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Main Navbar ── */}
      <header className="top-navbar" style={{ background: 'rgba(9, 13, 22, 0.95)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        {/* Brand */}
        <div className="brand-section">
          <div className="brand-logo-icon" style={{ background: 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)' }}>
            <Shield size={20} strokeWidth={2.5} color="#050b14" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="brand-title">ThreatFlow AI</span>
              <span className="brand-badge" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                Evaluation 1 Prototype
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Visual AST Attack Graph & Chokepoint Defense Dashboard
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <nav style={{ display: 'flex', gap: 6, background: 'rgba(15, 23, 42, 0.8)', padding: 4, borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={() => setActiveTab('story')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'story' ? 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)' : 'transparent',
              color: activeTab === 'story' ? '#050b14' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <LayoutDashboard size={14} />
            <span>Attack Story Flow</span>
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'graph' ? 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)' : 'transparent',
              color: activeTab === 'graph' ? '#050b14' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <GitGraph size={14} />
            <span>Attack Graph Workspace ({scanData?.graph?.nodes?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('patch')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'patch' ? 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)' : 'transparent',
              color: activeTab === 'patch' ? '#050b14' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <ShieldCheck size={14} />
            <span>1-Click Fix Studio</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'table' ? 'linear-gradient(135deg, #00f2fe 0%, #0284c7 100%)' : 'transparent',
              color: activeTab === 'table' ? '#050b14' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <ListFilter size={14} />
            <span>Findings ({scanData?.findings?.length || 0})</span>
          </button>
        </nav>

        {/* Project Selector & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={activeTarget}
            onChange={(e) => {
              setActiveTarget(e.target.value);
              executeScan(e.target.value);
            }}
            style={{
              padding: '6px 12px',
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 6,
              color: '#f8fafc',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="test-project">Express AST Test Suite (Multi-tier Injection)</option>
            <option value="demo-vuln-app">Demo Vulnerable App (backend/demo-vuln-app)</option>
            <option value="pipeline-safe">Safe Clean Pipeline (0 Vulnerabilities)</option>
          </select>

          <button
            className="btn-primary"
            disabled={isScanning}
            onClick={() => executeScan(activeTarget)}
            style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isScanning ? (
              <>
                <Activity size={14} className="pulse-dot" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Run Scan</span>
              </>
            )}
          </button>

          <button
            className="btn-secondary"
            title="Upload Project ZIP or .js file"
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
          >
            <Upload size={14} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadFile}
            accept=".zip,.js,.json"
            style={{ display: 'none' }}
          />

          {/* Backend Status indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.72rem',
              padding: '4px 10px',
              borderRadius: 20,
              background: scanError ? 'rgba(239, 68, 68, 0.15)' : backendOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              color: scanError ? '#f87171' : backendOnline ? '#34d399' : '#fbbf24',
              border: `1px solid ${scanError ? 'rgba(239, 68, 68, 0.35)' : backendOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            <Server size={12} />
            <span>{scanError ? 'Scan Error' : backendOnline ? ':3001 Live' : 'Backend Offline'}</span>
          </div>
        </div>
      </header>

      {/* ── Security Posture Metrics Strip ── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          padding: '12px 24px',
          background: 'rgba(11, 17, 32, 0.65)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        {/* Metric 1: Total Attack Paths */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: isCleanProject ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)', border: `1px solid ${isCleanProject ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isCleanProject ? <ShieldCheck size={18} color="#10b981" /> : <AlertTriangle size={18} color="#ef4444" />}
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Total Attack Paths</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
              {scanData?.attackPaths?.length ?? 0}{' '}
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isCleanProject ? '#34d399' : '#f87171' }}>
                {isCleanProject ? 'Clean / 0 Detected' : 'Paths Identified'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Max Risk Posture */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: isCleanProject ? 'rgba(16, 185, 129, 0.14)' : 'rgba(245, 158, 11, 0.14)', border: `1px solid ${isCleanProject ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={18} color={isCleanProject ? '#10b981' : '#f59e0b'} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Max Risk Posture</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: isCleanProject ? '#34d399' : '#f8fafc' }}>
                {isCleanProject ? 'SAFE / CLEAN' : (riskSummary.overallPosture || 'CRITICAL')}
              </span>
              <span style={{ fontSize: '0.72rem', padding: '1px 6px', borderRadius: 4, background: isCleanProject ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.2)', color: isCleanProject ? '#34d399' : '#f87171', border: `1px solid ${isCleanProject ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}` }}>
                {isCleanProject ? '0/9' : `${riskSummary.maxRiskScore || 9}/9`}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Analyzed Routes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(168, 85, 247, 0.14)', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe size={18} color="#c084fc" />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Analyzed Ingress Routes</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
              {routeNodesCount} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#c084fc' }}>Exposed Endpoints</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Identified Chokepoints */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Target size={18} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Identified Chokepoints</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
              {chokepointsCount} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34d399' }}>{isCleanProject ? '0 Needed (Secure)' : 'Fixes Collapse All'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Workspace ── */}
      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Scan Error State Banner */}
        {scanError && !isScanning && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
            <div
              style={{
                maxWidth: 680,
                width: '100%',
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(239, 68, 68, 0.12)',
                borderRadius: 16,
                padding: '32px 36px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertOctagon size={26} color="#ef4444" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                      Scan Execution Failed
                    </h3>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                      }}
                    >
                      Backend Error
                    </span>
                  </div>

                  <p style={{ fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6, marginTop: 10 }}>
                    {scanError}
                  </p>

                  <div
                    style={{
                      marginTop: 16,
                      padding: '12px 14px',
                      background: 'rgba(9, 13, 22, 0.75)',
                      borderRadius: 8,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                      Scan Diagnostics
                    </div>
                    <div className="mono" style={{ fontSize: '0.78rem', color: '#22d3ee', marginTop: 4 }}>
                      Selected Target: <span style={{ color: '#f8fafc' }}>{activeTarget}</span>
                    </div>
                    <div className="mono" style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                      Backend Endpoint: http://localhost:3001/api/scan
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                    <button
                      className="btn-primary"
                      onClick={() => executeScan(activeTarget)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}
                    >
                      <RotateCcw size={14} />
                      <span>Retry Scan</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isScanning && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <Activity size={32} color="#00f2fe" className="pulse-dot" />
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
              Executing Babel AST & Source-to-Sink Taint Scan...
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Querying backend at http://localhost:3001/api/scan
            </div>
          </div>
        )}

        {/* Normal Content Views (when no error and not scanning) */}
        {!scanError && !isScanning && (
          <>
            {/* TAB 1: Attack Story Flow */}
            {activeTab === 'story' && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <AttackStoryFlow
                  attackPaths={scanData?.attackPaths || []}
                  activePathId={activePathId}
                  onSelectPath={setActivePathId}
                  chokepoints={scanData?.chokepoints}
                />
              </div>
            )}

            {/* TAB 2: Interactive Split Workspace */}
            {activeTab === 'graph' && (
              <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '7fr 3fr', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: '100%', minHeight: 0, borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 18,
                      zIndex: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(9, 13, 22, 0.88)',
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <Radio size={14} color="#00f2fe" className="pulse-dot" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0' }}>
                      Interactive Directed Attack Graph ({scanData?.graph?.nodes?.length || 0} Nodes)
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      • Click node to inspect • Click path to filter
                    </span>
                  </div>

                  <AttackGraphCanvas
                    graph={scanData?.graph}
                    activePathId={activePathId}
                    onSelectNode={setSelectedNode}
                  />

                  {/* Node Details Slide-Over Drawer */}
                  <NodeDetailsDrawer
                    node={selectedNode}
                    onClose={() => setSelectedNode(null)}
                    onSelectPath={setActivePathId}
                  />
                </div>

                {/* Right 30%: Priority Attack Feed & Master Chokepoint Panel */}
                <div style={{ overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, background: 'rgba(9, 13, 22, 0.6)' }}>
                  <ChokepointPanel chokepoints={scanData?.chokepoints} />

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                      Priority Attack Paths (Sorted by Risk Score)
                    </div>
                    <AttackPathsPanel
                      attackPaths={scanData?.attackPaths || []}
                      activePathId={activePathId}
                      onSelectPath={setActivePathId}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 1-Click Fix Studio */}
            {activeTab === 'patch' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <CodePatchView
                  chokepoints={scanData?.chokepoints}
                  attackPaths={scanData?.attackPaths || []}
                />
              </div>
            )}

            {/* TAB 4: Findings Table */}
            {activeTab === 'table' && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <FindingsTableView findings={scanData?.findings || []} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
