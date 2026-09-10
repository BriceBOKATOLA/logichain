import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './ApiClient';

/**
 * AuthService — Authentification + persistance sécurisée des tokens.
 * Encapsule toute la logique métier ; les écrans n'appellent jamais AsyncStorage directement.
 */
class AuthService {
  async login(email, password) {
    const { data } = await apiClient.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = data.data;
    await AsyncStorage.multiSet([
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
      ['user', JSON.stringify(user)],
    ]);
    return user;
  }

  async logout() {
    try { await apiClient.post('/auth/logout'); } catch (e) { /* offline: on nettoie quand même */ }
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
  }

  async getCurrentUser() {
    const raw = await AsyncStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  async getAccessToken() {
    return AsyncStorage.getItem('accessToken');
  }
}

export default new AuthService();
