import React, { useState } from 'react';
import { Search, Filter, ShieldAlert, FileCode, CheckCircle, Database, Terminal } from 'lucide-react';

export function FindingsTableView({ findings = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filtered = findings.filter((f) => {
    const matchesSearch =
      (f.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.file || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.sink || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSev = filterSeverity === 'ALL' || f.severity === filterSeverity;
    return matchesSearch && matchesSev;
  });

  return (
    <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header and Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
            All Detected Security Findings ({findings.length})
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Extracted directly from Babel AST traversal and source-to-sink taint analysis.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#64748b" style={{ position: 'absolute', left: 10, top: 10 }} />
            <input
              type="text"
              placeholder="Search by file or rule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '8px 12px 8px 32px',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
          </div>

          {/* Severity filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#f8fafc',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
          </select>
        </div>
      </div>

      {/* Modern Table */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Severity</th>
              <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Vulnerability Type</th>
              <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Location (File:Line)</th>
              <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Taint Source</th>
              <th style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Dangerous Sink</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                  No matching findings.
                </td>
              </tr>
            ) : (
              filtered.map((f, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: f.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: f.severity === 'CRITICAL' ? '#f87171' : '#fbbf24',
                        border: `1px solid ${f.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                      }}
                    >
                      {f.severity || 'HIGH'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#f1f5f9' }}>
                    {f.type}
                  </td>
                  <td style={{ padding: '14px 18px', fontFamily: 'JetBrains Mono', color: '#00f2fe', fontSize: '0.8rem' }}>
                    {f.file}:{f.line}
                  </td>
                  <td style={{ padding: '14px 18px', fontFamily: 'JetBrains Mono', color: '#fbbf24', fontSize: '0.8rem' }}>
                    {f.source || '—'}
                  </td>
                  <td style={{ padding: '14px 18px', fontFamily: 'JetBrains Mono', color: '#f87171', fontSize: '0.8rem' }}>
                    {f.sink || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
