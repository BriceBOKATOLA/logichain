import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/env';

/**
 * ApiClient — Point unique de communication HTTP avec le backend LogiChain.
 * Gère l'injection du JWT et le rafraîchissement automatique de session
 * (intercepteur 401 -> refresh -> rejeu de la requête d'origine).
 */
class ApiClient {
  constructor() {
    this.http = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });
    this._onSessionExpired = null;
    this._configureInterceptors();
  }

  /**
   * Permet à AuthContext de s'abonner à une expiration de session définitive
   * (refresh token invalide/expiré). Sans ce branchement, l'UI resterait
   * "connectée" en apparence alors que toutes les requêtes échoueraient
   * silencieusement en boucle — un état zombie confus pour l'agent terrain.
   */
  onSessionExpired(callback) {
    this._onSessionExpired = callback;
  }

  _configureInterceptors() {
    this.http.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    this.http.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
          original._retry = true;
          try {
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            if (!refreshToken) throw new Error('Aucun refresh token disponible.');
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
            await AsyncStorage.setItem('accessToken', data.data.accessToken);
            await AsyncStorage.setItem('refreshToken', data.data.refreshToken);
            original.headers.Authorization = `Bearer ${data.data.accessToken}`;
            return this.http(original);
          } catch (refreshError) {
            await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
            this._onSessionExpired?.();
          }
        }
        return Promise.reject(error);
      },
    );
  }

  get(url, config) { return this.http.get(url, config); }
  post(url, body, config) { return this.http.post(url, body, config); }
  patch(url, body, config) { return this.http.patch(url, body, config); }
}

export default new ApiClient();
