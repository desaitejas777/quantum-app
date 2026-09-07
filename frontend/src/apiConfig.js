const configuredApi = process.env.REACT_APP_API_URL?.replace(/\/+$/, '');
const API = configuredApi
	? configuredApi.endsWith('/api') ? configuredApi : `${configuredApi}/api`
	: (process.env.NODE_ENV === 'development' ? 'http://localhost:5000/api' : '/api');

export default API;
