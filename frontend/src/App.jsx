import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Shield,
  Activity,
  GitFork,
  Radio,
  Server,
  AlertOctagon,
  Target,
  Sparkles,
  LayoutDashboard,
  GitGraph,
  ShieldCheck,
  ListFilter,
  Play,
  Upload,
} from 'lucide-react';
import { checkBackendHealth, scanProject, uploadAndScan } from './services/api';
import { AttackGraphCanvas } from './components/AttackGraphCanvas';
import { AttackStoryFlow } from './components/AttackStoryFlow';
import { CodePatchView } from './components/CodePatchView';
import { FindingsTableView } from './components/FindingsTableView';

export function App() {
  const [activeTab, setActiveTab] = useState('story'); // 'story', 'graph', 'patch', 'table'
  const [scanData, setScanData] = useState(null);
  const [activePathId, setActivePathId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [activeTarget, setActiveTarget] = useState('test-project');
  const fileInputRef = useRef(null);

  const executeScan = useCallback(async (target) => {
    setIsScanning(true);

    try {
      const isOnline = await checkBackendHealth();
      setBackendOnline(isOnline);

      let projectPath = '';
      let projectName = 'Express AST Test Suite';

      if (target === 'test-project') {
        projectPath = '../analyzer/test-project';
        projectName = 'Express AST Test Suite';
      } else if (target === 'demo-app') {
        projectPath = '../demo-vuln-app';
        projectName = 'Demo Vulnerable App';
      }

      const result = await scanProject(projectName, projectPath);
      if (result?.data) {
        setScanData(result.data);
        if (result.data.attackPaths?.length > 0) {
          setActivePathId(result.data.attackPaths[0].id);
        }
      }
    } catch (err) {
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  useEffect(() => {
    executeScan('test-project');
  }, [executeScan]);

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const result = await uploadAndScan(file, file.name.replace(/\.[^/.]+$/, ''));
      setScanData(result.data);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const riskSummary = scanData?.riskSummary || {
    overallPosture: 'CRITICAL',
    totalPaths: scanData?.attackPaths?.length || 3,
  };

  const postureClass = `posture-${(riskSummary.overallPosture || 'CRITICAL').toLowerCase()}`;

  return (
    <div className="app-container" style={{ background: '#070a12' }}>
      {/* Top Main Navbar */}
      <header className="top-navbar">
        {/* Brand */}
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Shield size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="brand-title">ThreatFlow AI</span>
              <span className="brand-badge">Evaluation 1</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
              Visual Security & Chokepoint Defense Dashboard
            </div>
          </div>
        </div>

        {/* User-Friendly Mode Switcher Tabs */}
        <nav style={{ display: 'flex', gap: 6, background: 'rgba(15, 23, 42, 0.8)', padding: 4, borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)' }}>
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
            <span>Full AST Graph ({scanData?.graph?.nodes?.length || 52})</span>
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
            <span>Findings ({scanData?.findings?.length || 3})</span>
          </button>
        </nav>

        {/* Controls: Target selector & Scanner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            value={activeTarget}
            onChange={(e) => {
              setActiveTarget(e.target.value);
              executeScan(e.target.value);
            }}
            style={{
              padding: '6px 10px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              color: '#f8fafc',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          >
            <option value="test-project">Express AST Test Suite</option>
            <option value="demo-app">Demo Vulnerable App</option>
          </select>

          <button
            className="btn-primary"
            disabled={isScanning}
            onClick={() => executeScan(activeTarget)}
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
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
            style={{ padding: '6px 10px' }}
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
              background: backendOnline ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
              color: backendOnline ? '#34d399' : '#fbbf24',
              border: `1px solid ${backendOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            }}
          >
            <Server size={12} />
            <span>{backendOnline ? ':3001 Live' : 'Verified Fallback'}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area based on Tab */}
      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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

        {activeTab === 'graph' && (
          <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            <div
              style={{
                position: 'absolute', top: 14, left: 18, zIndex: 10,
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(10, 15, 28, 0.85)', padding: '6px 14px',
                borderRadius: 8, border: '1px solid var(--border-medium)', backdropFilter: 'blur(8px)',
              }}
            >
              <Radio size={14} color="#00f2fe" className="pulse-dot" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0' }}>
                Full Lateral Attack Graph ({scanData?.graph?.nodes?.length || 52} Nodes)
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                • Scroll to zoom • Drag to pan
              </span>
            </div>
            <AttackGraphCanvas
              graph={scanData?.graph}
              activePathId={activePathId}
              onSelectNode={setSelectedNode}
            />
          </div>
        )}

        {activeTab === 'patch' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <CodePatchView
              chokepoints={scanData?.chokepoints}
              attackPaths={scanData?.attackPaths || []}
            />
          </div>
        )}

        {activeTab === 'table' && (
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <FindingsTableView findings={scanData?.findings || []} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

