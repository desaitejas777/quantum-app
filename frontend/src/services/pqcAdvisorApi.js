const configuredBase = process.env.REACT_APP_PQC_API_URL || 'http://127.0.0.1:8000';
const API_BASE = configuredBase.replace(/\/+$/, '').endsWith('/api')
  ? configuredBase.replace(/\/+$/, '')
  : `${configuredBase.replace(/\/+$/, '')}/api`;

async function request(path, body) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('The PQC recommender server could not be reached. Start the QuantProject backend and try again.');
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
