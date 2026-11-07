import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: API_URL });

// Attach the access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, try to refresh once, then retry the original request
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const refresh = localStorage.getItem("refresh");

    if (error.response?.status === 401 && !original._retry && refresh) {
      original._retry = true;
      try {
        // share one refresh call if several requests fail at once
        refreshing =
          refreshing || axios.post(`${API_URL}/auth/refresh/`, { refresh });
        const { data } = await refreshing;
        refreshing = null;

        localStorage.setItem("access", data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (err) {
        refreshing = null;
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;