import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  failedQueue = [];
};

// Auto-refresh access token on 401 expired
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const isExpired = error.response?.status === 401 && error.response?.data?.expired;
    if (!isExpired || original._retry) {
      // Hard 401 (not expired) — logout
      if (error.response?.status === 401 && !error.response?.data?.expired) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post('/api/auth/refresh', { refreshToken });
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);

      api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
      original.headers.Authorization = `Bearer ${data.token}`;
      processQueue(null, data.token);
      return api(original);
    } catch (err) {
      processQueue(err, null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
