import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import authService from '../services/AuthService';
import apiClient from '../services/ApiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });

    // Si le refresh token finit par être définitivement invalide/expiré,
    // ApiClient nous prévient pour qu'on ramène l'UI à l'écran de connexion
    // au lieu de rester dans un état "connecté" en apparence mais inopérant.
    apiClient.onSessionExpired(() => setUser(null));
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await authService.login(email, password);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext doit être utilisé dans un <AuthProvider>.');
  return ctx;
}
