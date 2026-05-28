import { Router } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { createRegistrationsService } from './registrations.service.js';
import { findPersistedIdentityByIdentifier } from '../auth/auth.persistence.js';
import { auth } from '../../auth/index.js';
import { asyncHandler, created, ok } from '../../utils/http.js';
import { HttpError } from '../../utils/http.js';

const router = Router();
const registrationsService = createRegistrationsService();

function buildRegistrationAuthPayload(registration, password) {
  return {
    name: registration.student.name,
    email: registration.student.email,
    password,
    username: registration.student.nis,
    role: 'student',
    studentId: String(registration.student.id),
    nis: registration.student.nis,
    accountId: registration.account.id,
    courseId: String(registration.enrollment.courseId),
    enrollmentId: registration.enrollment.id,
  };
}

router.get('/options', asyncHandler(async (req, res) => {
  ok(res, registrationsService.getFormOptions());
}));

router.post('/', asyncHandler(async (req, res) => {
  const registration = await registrationsService.createRegistration(req.body || {});

  try {
    await auth.api.signUpEmail({
      body: buildRegistrationAuthPayload(registration, req.body?.password),
      headers: fromNodeHeaders(req.headers),
    });
  } catch (error) {
    await registrationsService.rollbackRegistrationArtifacts(registration);

    if (error?.statusCode === 422 || error?.statusCode === 400) {
      throw new HttpError(409, 'Email ini sudah terdaftar. Silakan login atau gunakan email lain.', {
        code: 'EMAIL_ALREADY_REGISTERED',
      });
    }

    throw new HttpError(error?.statusCode || 500, error?.message || 'Registrasi auth gagal diproses.', {
      code: error?.code || 'AUTH_REGISTRATION_FAILED',
    });
  }

  const persistedIdentity = await findPersistedIdentityByIdentifier(registration.student.email).catch(() => null);
  await registrationsService.finalizeRegistration({
    ...registration,
    authUserId: persistedIdentity?.authUser?.id || null,
  });
  created(res, registration);
}));

router.get('/:registrationId', asyncHandler(async (req, res) => {
  ok(res, registrationsService.getRegistration(req.params.registrationId));
}));

export default router;
