import { createAdminService, createServiceError, ensure } from '../admin/admin.service.js';

function createSessionToken() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function extractBearerToken(input) {
  const header = String(input || '').trim();
  if (!header) return '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : header;
}

export function createAuthService(options = {}) {
  const adminService = createAdminService(options);
  const context = adminService.getContext();
  const { repositories } = context;

  return {
    authenticate(payload = {}) {
      ensure(payload.identifier, 'Identifier login wajib diisi.', 400, 'IDENTIFIER_REQUIRED');
      ensure(payload.password, 'Password wajib diisi.', 400, 'PASSWORD_REQUIRED');

      const account = adminService.findAccountByIdentifier(payload.identifier);
      ensure(account, 'Email/NIS/username atau password salah.', 401, 'INVALID_CREDENTIALS');
      ensure(String(account.password || '') === String(payload.password || ''), 'Email/NIS/username atau password salah.', 401, 'INVALID_CREDENTIALS');

      const user = adminService.buildSessionUser(account);
      ensure(user, 'Akun ditemukan tetapi data siswa belum lengkap.', 409, 'ACCOUNT_DATA_INCOMPLETE');

      return {
        account,
        user,
      };
    },

    login(payload = {}) {
      const { account, user } = this.authenticate(payload);

      const createdAt = context.now();
      const token = createSessionToken();
      repositories.sessions.insert({
        id: token,
        token,
        accountId: account.id,
        userId: user.id,
        role: user.role,
        createdAt,
        updatedAt: createdAt,
        meta: payload.meta || {},
      });

      return {
        token,
        user,
      };
    },

    resolveSession(token) {
      const normalizedToken = extractBearerToken(token);
      ensure(normalizedToken, 'Token sesi belum dikirim.', 401, 'TOKEN_REQUIRED');

      const session = repositories.sessions.raw().find((item) => String(item.token) === String(normalizedToken)) || null;
      ensure(session, 'Sesi login tidak ditemukan.', 401, 'SESSION_NOT_FOUND');

      const account = repositories.accounts.raw().find((item) => String(item.id) === String(session.accountId)) || null;
      ensure(account, 'Akun sesi tidak ditemukan.', 401, 'ACCOUNT_NOT_FOUND');

      const user = adminService.buildSessionUser(account);
      ensure(user, 'Data user sesi tidak lengkap.', 409, 'SESSION_USER_INCOMPLETE');

      repositories.sessions.update(session.id, (item) => ({
        ...item,
        updatedAt: context.now(),
      }));

      return {
        token: normalizedToken,
        user,
      };
    },

    logout(token) {
      const normalizedToken = extractBearerToken(token);
      ensure(normalizedToken, 'Token sesi belum dikirim.', 400, 'TOKEN_REQUIRED');
      const removed = repositories.sessions.remove(normalizedToken);
      ensure(removed, 'Sesi login tidak ditemukan.', 404, 'SESSION_NOT_FOUND');
      return {
        success: true,
      };
    },

    requireSession(token) {
      try {
        return this.resolveSession(token);
      } catch (error) {
        throw createServiceError(error.status || 401, error.message, error.code || 'UNAUTHORIZED', error.details);
      }
    },
  };
}

export default createAuthService;