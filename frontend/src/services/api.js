const API_BASE = '/api';

/**
 * Checks if the backend server is reachable on :3001
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Initiates an AST scan on a project path against the live backend.
 * Never silently substitutes fake fixture data on failure.
 */
export async function scanProject(projectKey = 'pipeline-vulnerable', customPath = '') {
  // Determine backend projectPath
  let projectPath = customPath;
  let projectName = projectKey;

  if (!projectPath) {
    if (projectKey === 'pipeline-vulnerable') {
      projectPath = '../analyzer/test-project';
      projectName = 'pipeline-vulnerable';
    } else if (projectKey === 'test-project') {
      projectPath = '../analyzer/test-project';
      projectName = 'test-project';
    } else if (projectKey === 'demo-vuln-app' || projectKey === 'demo-app') {
      // Demo Vulnerable App is located inside backend/demo-vuln-app
      projectPath = 'demo-vuln-app';
      projectName = 'demo-vuln-app';
    } else if (projectKey === 'pipeline-safe') {
      // Clean safe subproject in test-project
      projectPath = '../analyzer/test-project/safe';
      projectName = 'pipeline-safe';
    }
  }

  try {
    const res = await fetch(`${API_BASE}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName, projectPath }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.message || data?.error || `Scan failed with status ${res.status}: ${res.statusText}`;
      throw new Error(errorMsg);
    }

    if (!data) {
      throw new Error('Backend returned an empty response.');
    }

    if (data.error) {
      throw new Error(data.message || data.error || 'Scan failed.');
    }

    return { success: true, data, source: 'live' };
  } catch (err) {
    let message = err.message;
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      message = 'Scan request timed out. The backend took too long to complete the AST analysis.';
    } else if (err.message === 'Failed to fetch' || err.message.includes('fetch failed')) {
      message = 'Cannot connect to backend server at http://localhost:3001. Please make sure the backend server is running.';
    }
    throw new Error(message);
  }
}

/**
 * Uploads a ZIP or JS file via Multer endpoint to the backend.
 * Never silently substitutes fake fixture data on failure.
 */
export async function uploadAndScan(file, projectName) {
  const formData = new FormData();
  formData.append('project', file);
  if (projectName) formData.append('projectName', projectName);

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.message || data?.error || `Upload failed with status ${res.status}: ${res.statusText}`;
      throw new Error(errorMsg);
    }

    if (!data) {
      throw new Error('Backend returned an empty response.');
    }

    if (data.error) {
      throw new Error(data.message || data.error || 'Upload scan failed.');
    }

    return { success: true, data, source: 'live' };
  } catch (err) {
    let message = err.message;
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      message = 'Upload scan timed out. The uploaded archive may be too large or processing took too long.';
    } else if (err.message === 'Failed to fetch' || err.message.includes('fetch failed')) {
      message = 'Cannot connect to backend server at http://localhost:3001. Please make sure the backend server is running.';
    }
    throw new Error(message);
  }
}
