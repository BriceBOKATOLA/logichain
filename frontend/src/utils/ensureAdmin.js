import apiClient from '../services/ApiClient';
import authService from '../services/AuthService';

const admin = {
  email: 'admin@logichain.io',
  password: 'Admin1234!',
  fullName: 'Admin LogiChain',
  role: 'admin',
};

export default async function ensureAdmin() {
  try {
    // Try to login first (will store tokens via authService)
    await authService.login(admin.email, admin.password);
    return true;
  } catch (err) {
    try {
      // If login failed, attempt to register the admin
      await apiClient.post('/auth/register', admin);
      await authService.login(admin.email, admin.password);
      return true;
    } catch (regErr) {
      console.warn('ensureAdmin: unable to ensure admin account', regErr?.message || regErr);
      return false;
    }
  }
}
