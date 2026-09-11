import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import authService from '../services/AuthService';
import apiClient from '../services/ApiClient';

const AuthContext = createContext(null);

/**
 * AuthContext (web) — Identique à AuthContext.js, à une exception près : seul
 * un compte `admin` peut ouvrir une session sur le tableau de bord web (les
 * agents de terrain/transporteurs/responsables logistique restent des
 * usages mobiles). Metro sélectionne ce fichier automatiquement pour les
 * builds web (suffixe `.web.js`) : AuthContext.js reste utilisé tel quel sur
 * Android/iOS, sans aucune restriction de rôle.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      // Une session mobile non-admin restée dans le stockage du navigateur ne
      // doit jamais rouvrir directement le tableau de bord web.
      setUser(u && u.role === 'admin' ? u : null);
      setLoading(false);
    });

    apiClient.onSessionExpired(() => setUser(null));
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await authService.login(email, password);
    if (u.role !== 'admin') {
      await authService.logout();
      const err = new Error('Seul un compte administrateur peut se connecter sur le tableau de bord web.');
      err.code = 'WEB_ADMIN_ONLY';
      throw err;
    }
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
