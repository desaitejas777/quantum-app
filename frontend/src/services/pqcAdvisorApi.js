const configuredBase = process.env.REACT_APP_PQC_API_URL?.trim();
const defaultBase = process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : '';
const normalizedBase = (configuredBase || defaultBase).replace(/\/+$/, '');
const API_BASE = normalizedBase
  ? (normalizedBase.endsWith('/api') ? normalizedBase : `${normalizedBase}/api`)
  : '';

async function request(path, body) {
  if (!API_BASE) {
    throw new Error('The PQC recommender is not configured. Set REACT_APP_PQC_API_URL in the frontend deployment and redeploy.');
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('The PQC recommender server could not be reached. Check the configured API URL and make sure the backend is deployed.');
  }

  if (!response.ok) {
    let message = `The PQC recommender request failed (${response.status}).`;
    try {
      const payload = await response.json();
      if (payload?.error?.message) message = payload.error.message;
    } catch {
      throw new Error(message);
    }
    throw new Error(message);
  }

  try {
    return await response.json();
  } catch {
    throw new Error('The PQC recommender returned an invalid response.');
  }
}

export const pqcAdvisorApi = {
  getOptions: () => request('/requirements/options'),
  assess: (requirements) => request('/assessment', requirements),
};
