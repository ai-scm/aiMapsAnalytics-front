import axios from 'axios';
import keycloak from './keycloak-config';

const api = axios.create({
  baseURL: process.env.API_URL
});

api.interceptors.request.use(
  config => {
    if (keycloak.token) {
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export default api;
