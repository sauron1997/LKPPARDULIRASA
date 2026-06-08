import { eq } from 'drizzle-orm';
import { createBackendContext } from '../../runtime/backend-context.js';
import { ensure } from '../../runtime/errors.js';
import { createPaymentsService } from '../payments/payments.service.js';
import {
  canUseDatabaseAuthPersistence,
  finalizePersistedIdentityLink,
} from '../auth/auth.persistence.js';
import { persistDataUrlMediaAsset } from '../media/media.storage.js';
import { requireDb } from '../../db/client.js';
  import {
    authUsers,
    enrollments as enrollmentTable,
    mediaAssets,
    payments as paymentsTable,
    students as studentTable,
  } from '../../db/schema/index.js';

function generateNextStudentId(students) {
  return students.reduce((highest, student) => Math.max(highest, Number(student.id) || 0), 0) + 1;
}

function generateNextNis(students) {
  const currentYear = new Date().getFullYear();
  const latestNumber = students.reduce((highest, student) => {
    const match = String(student.nis || '').match(/(\d{3,})$/);
    return Math.max(highest, Number(match?.[1] || 0));
  }, 0);

  return `PRK-${currentYear}-${String(latestNumber + 1).padStart(3, '0')}`;
}

function generateEnrollmentId(enrollments) {
  const currentYear = new Date().getFullYear();
  const latestNumber = enrollments.reduce((highest, enrollment) => {
    const match = String(enrollment.id || '').match(/(\d{3,})$/);
    return Math.max(highest, Number(match?.[1] || 0));
  }, 0);

  return `enr-${currentYear}-${String(latestNumber + 1).padStart(3, '0')}`;
}

function parsePriceValue(priceLabel = '') {
  const digits = String(priceLabel).replace(/[^0-9]/g, '');
  return parseInt(digits, 10) || 0;
}

export function createRegistrationsService(options = {}) {
  const context = createBackendContext(options);
  const { repositories } = context;

  async function createPersistedRegistrationArtifacts(student, enrollment) {
    const database = requireDb();
    const now = new Date(student.createdAt || Date.now());

    await database.transaction(async (tx) => {
      await tx.insert(studentTable).values({
        id: student.id,
        authUserId: null,
        accountId: student.accountId,
        nis: student.nis,
        name: student.name,
        email: student.email,
        phone: student.phone || '',
        address: student.address || '',
        status: student.status || 'Aktif',
        parentName: student.parentName || null,
        photoMediaId: student.photoMediaId || null,
        ijazahMediaId: student.ijazahMediaId || null,
        identityMediaId: null,
        registrationDate: student.registrationDate || null,
        notes: student.notes || '',
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(enrollmentTable).values({
        id: enrollment.id,
        studentId: student.id,
        courseId: enrollment.courseId,
        programSnapshot: enrollment.program || '',
        status: enrollment.status || 'active',
        paymentStatus: enrollment.paymentStatus || 'pending',
        paymentDate: enrollment.paymentDate || null,
        registrationDate: enrollment.registrationDate || null,
        startedAt: enrollment.startedAt || null,
        completedAt: null,
        currentModuleId: enrollment.currentModuleId || null,
        progressPercent: Number(enrollment.progressPercent || 0),
        notes: '',
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  async function persistMediaFile(dataUrl, fileName, ownerType, ownerId) {
    if (!dataUrl) return null;

    const mediaId = `${ownerType}-${ownerId}-${Date.now()}`;
    const result = await persistDataUrlMediaAsset({
      dataUrl,
      fileName,
      mediaId,
      ownerType,
      ownerId: String(ownerId),
    });

    if (!result) return null;

    const database = requireDb();
    await database.insert(mediaAssets).values({
      id: mediaId,
      visibility: 'public',
      storageKey: result.storageKey,
      publicUrl: result.publicUrl,
      originalName: result.originalName,
      mimeType: result.mimeType,
      ownerType,
      ownerId: String(ownerId),
      metadata: result.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return mediaId;
  }

  return {
    getFormOptions() {
      return {
        courses: repositories.courses.list(),
        modules: repositories.modules.list(),
      };
    },

    async createRegistration(payload = {}) {
      ensure(payload.name, 'Nama lengkap wajib diisi.', 400, 'NAME_REQUIRED');
      ensure(payload.email, 'Email wajib diisi.', 400, 'EMAIL_REQUIRED');
      ensure(payload.password, 'Password wajib diisi.', 400, 'PASSWORD_REQUIRED');
      ensure(payload.address, 'Alamat wajib diisi.', 400, 'ADDRESS_REQUIRED');
      ensure(payload.phone, 'No HP wajib diisi.', 400, 'PHONE_REQUIRED');
      ensure(payload.parentName, 'Nama orang tua wajib diisi.', 400, 'PARENT_NAME_REQUIRED');
      ensure(payload.courseId, 'Program kursus wajib dipilih.', 400, 'COURSE_REQUIRED');

      const normalizedEmail = String(payload.email).trim().toLowerCase();
      const selectedCourse = repositories.courses.raw().find((course) => String(course.id) === String(payload.courseId)) || null;

      ensure(selectedCourse, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');

      const memoryStudents = repositories.students.raw();
      const accounts = repositories.accounts.raw();
      const memoryEnrollments = repositories.enrollments.raw();
      const database = canUseDatabaseAuthPersistence() ? requireDb() : null;
      const persistedStudents = database ? await database.select().from(studentTable) : [];
      const persistedEnrollments = database ? await database.select().from(enrollmentTable) : [];
      const persistedAuthUsers = database ? await database.select().from(authUsers).where(eq(authUsers.email, normalizedEmail)).limit(1) : [];
      const students = [...persistedStudents, ...memoryStudents];
      const enrollments = [...persistedEnrollments, ...memoryEnrollments];

      const emailTaken = students.some((student) => String(student.email || '').trim().toLowerCase() === normalizedEmail)
        || accounts.some((account) => String(account.email || '').trim().toLowerCase() === normalizedEmail)
        || persistedAuthUsers.length > 0;

      ensure(!emailTaken, 'Email ini sudah terdaftar. Silakan login atau gunakan email lain.', 409, 'EMAIL_ALREADY_REGISTERED');

      const createdAt = context.now();
      const createdDate = createdAt.slice(0, 10);
      const studentId = generateNextStudentId(students);
      const nis = generateNextNis(students);
      const enrollmentId = generateEnrollmentId(enrollments);
      const accountId = `acc-student-${studentId}`;
      const firstModule = repositories.modules.list()
        .filter((item) => String(item.courseId) === String(selectedCourse.id))
        .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))[0] || null;

      // Persist media files first (need studentId as ownerId)
      let photoMediaId = null;
      let ijazahMediaId = null;

      if (canUseDatabaseAuthPersistence()) {
        if (payload.photoDataUrl) {
          photoMediaId = await persistMediaFile(payload.photoDataUrl, 'pas-foto-4x6.jpg', 'student', studentId);
        }
        if (payload.ijazahDataUrl) {
          ijazahMediaId = await persistMediaFile(payload.ijazahDataUrl, 'foto-ijazah.jpg', 'student', studentId);
        }
      }

      const student = {
        id: studentId,
        nis,
        name: String(payload.name).trim(),
        email: normalizedEmail,
        phone: String(payload.phone).trim(),
        address: String(payload.address).trim(),
        parentName: String(payload.parentName).trim(),
        photoMediaId,
        ijazahMediaId,
        program: selectedCourse.title,
        courseId: selectedCourse.id,
        enrollmentId,
        accountId,
        status: 'Aktif',
        paymentStatus: 'pending',
        paymentDate: null,
        registrationDate: createdDate,
        identityAttachmentName: payload.identityAttachmentName || '',
        notes: payload.identityAttachmentName ? `Lampiran identitas: ${payload.identityAttachmentName}` : '',
        createdAt,
        updatedAt: createdAt,
      };

      const account = {
        id: accountId,
        username: normalizedEmail,
        loginId: normalizedEmail,
        password: String(payload.password),
        role: 'student',
        name: student.name,
        displayName: student.name,
        email: normalizedEmail,
        studentId,
        nis,
        courseId: selectedCourse.id,
        enrollmentId,
        status: 'active',
        createdAt,
        updatedAt: createdAt,
      };

      const enrollment = {
        id: enrollmentId,
        studentId,
        courseId: selectedCourse.id,
        program: selectedCourse.title,
        status: 'active',
        paymentStatus: 'pending',
        registrationDate: createdDate,
        paymentDate: null,
        startedAt: createdDate,
        currentModuleId: firstModule?.id || null,
        progressPercent: 0,
        createdAt,
        updatedAt: createdAt,
      };

      if (canUseDatabaseAuthPersistence()) {
        await createPersistedRegistrationArtifacts(student, enrollment);
      }

      repositories.students.insert(student);
      repositories.accounts.insert(account);
      repositories.enrollments.insert(enrollment);

      // Auto-create payment transaction
      let payment = null;
      try {
        const amount = parsePriceValue(selectedCourse.price);
        const paymentsService = createPaymentsService(options);
        const paymentResult = await paymentsService.createPaymentTransaction({
          enrollmentId,
          studentId,
          amount,
          itemDetails: [{
            id: String(selectedCourse.id),
            name: selectedCourse.title,
            price: amount,
            quantity: 1,
          }],
          customerDetails: {
            first_name: student.name,
            email: student.email,
            phone: student.phone,
          },
        });
        payment = {
          paymentId: paymentResult.paymentId,
          redirectUrl: paymentResult.redirectUrl,
          token: paymentResult.token,
          publicAccessToken: paymentResult.publicAccessToken,
        };
      } catch (paymentError) {
        // Payment creation failed but registration succeeded
        // Return registration without payment info - student can pay later
        console.error('Payment creation failed:', paymentError.message);
      }

      return {
        registeredEmail: normalizedEmail,
        redirectTo: payment ? `/payment/${enrollmentId}?token=${encodeURIComponent(payment.publicAccessToken)}` : '/login',
        student,
        account: {
          ...account,
          password: undefined,
        },
        enrollment,
        payment,
      };
    },

    getRegistration(registrationId) {
      const enrollment = repositories.enrollments.raw().find((item) => String(item.id) === String(registrationId)) || null;
      ensure(enrollment, 'Data pendaftaran tidak ditemukan.', 404, 'REGISTRATION_NOT_FOUND');

      const student = repositories.students.raw().find((item) => String(item.id) === String(enrollment.studentId)) || null;
      const account = repositories.accounts.raw().find((item) => String(item.studentId) === String(student?.id)) || null;
      const course = repositories.courses.raw().find((item) => String(item.id) === String(enrollment.courseId)) || null;

      return {
        enrollment,
        student,
        account: account ? { ...account, password: undefined } : null,
        course,
      };
    },

    async finalizeRegistration(registration = {}) {
      if (!canUseDatabaseAuthPersistence() || !registration?.student || !registration?.enrollment) {
        return registration;
      }

      const linkedIdentity = await finalizePersistedIdentityLink({
        authUserId: registration.authUserId,
        student: registration.student,
        enrollment: registration.enrollment,
        role: 'student',
      });

      return {
        ...registration,
        linkedIdentity,
      };
    },

    async rollbackRegistrationArtifacts(registration = {}) {
      if (canUseDatabaseAuthPersistence()) {
        const database = requireDb();

        if (registration.enrollment?.id) {
          await database.delete(paymentsTable).where(eq(paymentsTable.enrollmentId, registration.enrollment.id));
          await database.delete(enrollmentTable).where(eq(enrollmentTable.id, registration.enrollment.id));
        }

        if (registration.student?.id) {
          await database.delete(studentTable).where(eq(studentTable.id, registration.student.id));
        }
      }

      if (registration.account?.id) {
        repositories.accounts.remove(registration.account.id);
      }

      if (registration.enrollment?.id) {
        repositories.enrollments.remove(registration.enrollment.id);
      }

      if (registration.student?.id) {
        repositories.students.remove(registration.student.id);
      }
    },
  };
}

export default createRegistrationsService;
