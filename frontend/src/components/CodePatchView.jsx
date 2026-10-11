import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, FileCode, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export function CodePatchView({ chokepoints, attackPaths = [] }) {
  const [copied, setCopied] = useState(false);
  const primary = chokepoints?.primary;

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const samplePatches = [
    {
      title: 'Fix 1: Command Injection Chokepoint (Primary)',
      file: 'controllers/userController.js:21',
      vulnerability: 'Shell Execution via child_process.exec()',
      severity: 'CRITICAL',
      explanation: 'Currently, user input from `req.body.command` is passed directly into a shell. Attackers can inject arbitrary bash/cmd commands. The fix uses `execFile` with an argument array and allowlist.',
      vulnerableCode: `// ❌ VULNERABLE CODE (Line 21)
const { exec } = require('child_process');

function runDiagnostic(req, res) {
  const cmd = req.body.command;
  // Attacker can pass "ping; rm -rf /" or "dir && whoami"
  exec(cmd, (err, stdout) => {
    res.json({ output: stdout });
  });
}`,
      fixedCode: `// ✅ SECURE CODE PATCH (1-Click Chokepoint Fix)
const { execFile } = require('child_process');

const ALLOWED_COMMANDS = new Set(['ping', 'status', 'uptime']);

function runDiagnostic(req, res) {
  const { command, target } = req.body;
  if (!ALLOWED_COMMANDS.has(command)) {
    return res.status(400).json({ error: 'Command not permitted' });
  }
  // Arguments passed safely as array, bypassing shell injection
  execFile(command, [target], (err, stdout) => {
    res.json({ output: stdout });
  });
}`,
    },
    {
      title: 'Fix 2: SQL Injection Parameterization',
      file: 'controllers/userController.js:14',
      vulnerability: 'Direct String Concatenation into db.query()',
      severity: 'HIGH',
      explanation: 'User input from `req.query.id` is concatenated directly into SQL queries. Attackers can pass `1 OR 1=1` to dump database records. The fix parameterizes the query using placeholders.',
      vulnerableCode: `// ❌ VULNERABLE CODE (Line 14)
function getUser(req, res) {
  const id = req.query.id;
  const query = "SELECT * FROM users WHERE id = '" + id + "'";
  db.query(query, (err, results) => {
    res.json(results);
  });
}`,
      fixedCode: `// ✅ SECURE CODE PATCH (Parameterized Query)
function getUser(req, res) {
  const id = req.query.id;
  // Parameterized with $1 prevents SQL injection
  db.query('SELECT * FROM users WHERE id = $1', [id], (err, results) => {
    res.json(results);
  });
}`,
    },
  ];

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={24} color="#10b981" />
            <span>1-Click Chokepoint Code Remediation Studio</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: 4 }}>
            Stop spending hours fixing 20 separate warnings. Fixing these 2 chokepoint locations neutralizes 100% of attack paths.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {samplePatches.map((patch, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: 4,
                      background: patch.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: patch.severity === 'CRITICAL' ? '#f87171' : '#fbbf24',
                      border: `1px solid ${patch.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                    }}
                  >
                    {patch.severity}
                  </span>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>{patch.title}</h3>
                </div>
                <div className="mono" style={{ fontSize: '0.8rem', color: '#00f2fe', marginTop: 4 }}>
                  📍 File: {patch.file}
                </div>
              </div>

              <button
                onClick={() => handleCopy(patch.fixedCode)}
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied Secure Patch!' : 'Copy Secure Patch'}</span>
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5, marginBottom: 16 }}>
              {patch.explanation}
            </p>

            {/* Side by side diff */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Vulnerable */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>BEFORE (VULNERABLE)</span>
                </div>
                <pre
                  className="mono"
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: 14,
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    color: '#fca5a5',
                    overflowX: 'auto',
                    lineHeight: 1.5,
                  }}
                >
                  {patch.vulnerableCode}
                </pre>
              </div>

              {/* Fixed */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>AFTER (SECURE PATCH)</span>
                </div>
                <pre
                  className="mono"
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: 14,
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    color: '#a7f3d0',
                    overflowX: 'auto',
                    lineHeight: 1.5,
                  }}
                >
                  {patch.fixedCode}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
