/* What the e2e scripts share: the environment they read, the REST client
 * that builds and removes their fixtures, and the failure report. The
 * variables are listed in the header of references-picker.e2e.js. */
const BASE = process.env.AURORA_E2E_BASE || 'http://127.0.0.1:8099/Plone15';
const USER = process.env.AURORA_E2E_USER || 'admin';
const PASSWORD = process.env.AURORA_E2E_PASSWORD || 'admin';
const EXECUTABLE = process.env.AURORA_E2E_CHROMIUM;
const PAGE_TYPE = process.env.AURORA_E2E_PAGE_TYPE || 'Document';
// 1x1 transparent PNG
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP8//8/AwAI/AL+p5qgoAAAAABJRU5ErkJggg==';
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASSWORD}`).toString('base64');

async function api(method, path, body, retried) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: AUTH,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 423 && method === 'DELETE' && !retried) {
    // An edit lock outlives a closed browser: steal it, then retry once.
    await api('DELETE', `${path}/@lock`, { force: true });
    return api(method, path, body, true);
  }
  if (!response.ok && response.status !== 404) {
    throw new Error(`${method} ${path} -> ${response.status}`);
  }
  return response.status === 204 || response.status === 404
    ? undefined
    : await response.json();
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

module.exports = { BASE, USER, PASSWORD, EXECUTABLE, PAGE_TYPE, PNG_B64, AUTH, api, fail };
