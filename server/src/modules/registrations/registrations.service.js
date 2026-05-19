import { createAdminService, ensure } from '../admin/admin.service.js';

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

export function createRegistrationsService(options = {}) {
  const adminService = createAdminService(options);
  const context = adminService.getContext();
  const { repositories } = context;

  return {
    getFormOptions() {
      return {
        courses: repositories.courses.list(),
        modules: repositories.modules.list(),
      };
    },

    createRegistration(payload = {}) {
      ensure(payload.name, 'Nama lengkap wajib diisi.', 400, 'NAME_REQUIRED');
      ensure(payload.email, 'Email wajib diisi.', 400, 'EMAIL_REQUIRED');
      ensure(payload.password, 'Password wajib diisi.', 400, 'PASSWORD_REQUIRED');
      ensure(payload.address, 'Alamat wajib diisi.', 400, 'ADDRESS_REQUIRED');
      ensure(payload.phone, 'No HP wajib diisi.', 400, 'PHONE_REQUIRED');
      ensure(payload.courseId, 'Program kursus wajib dipilih.', 400, 'COURSE_REQUIRED');

      const normalizedEmail = String(payload.email).trim().toLowerCase();
      const selectedCourse = repositories.courses.raw().find((course) => String(course.id) === String(payload.courseId)) || null;

      ensure(selectedCourse, 'Program kursus tidak ditemukan.', 404, 'COURSE_NOT_FOUND');

      const students = repositories.students.raw();
      const accounts = repositories.accounts.raw();
      const enrollments = repositories.enrollments.raw();

      const emailTaken = students.some((student) => String(student.email || '').trim().toLowerCase() === normalizedEmail)
        || accounts.some((account) => String(account.email || '').trim().toLowerCase() === normalizedEmail);

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

      const student = {
        id: studentId,
        nis,
        name: String(payload.name).trim(),
        email: normalizedEmail,
        phone: String(payload.phone).trim(),
        address: String(payload.address).trim(),
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

      repositories.students.insert(student);
      repositories.accounts.insert(account);
      repositories.enrollments.insert(enrollment);

      return {
        registeredEmail: normalizedEmail,
        redirectTo: '/login',
        student,
        account: {
          ...account,
          password: undefined,
        },
        enrollment,
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

    rollbackRegistrationArtifacts(registration = {}) {
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
