import { desc, eq } from 'drizzle-orm';
import { buildSessionUser, normalizeLoginIdentifier } from '@lkp-parduli-rasa/domain/domain-relations';
import { isDatabaseConfigured, requireDb } from '../../db/client.js';
import {
  authUsers,
  courses,
  enrollments,
  loginIdentifiers,
  students,
  userProfiles,
} from '../../db/schema/index.js';

function toIntegerOrNull(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function toIsoString(value) {
  if (!value) {
    return '';
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function pickPrimaryEnrollment(items = [], preferredEnrollmentId = null) {
  if (!items.length) {
    return null;
  }

  if (preferredEnrollmentId) {
    const matched = items.find((item) => String(item.id) === String(preferredEnrollmentId));
    if (matched) {
      return matched;
    }
  }

  const active = items.filter((item) => String(item.status || '').toLowerCase() === 'active');
  if (active.length > 0) {
    return active[0];
  }

  return items[0];
}

function mapCourse(course) {
  if (!course) {
    return null;
  }

  return {
    ...course,
    createdAt: toIsoString(course.createdAt),
    updatedAt: toIsoString(course.updatedAt),
  };
}

function mapEnrollment(enrollment, course) {
  if (!enrollment) {
    return null;
  }

  return {
    ...enrollment,
    program: enrollment.programSnapshot || course?.title || '',
    courseTitleSnapshot: enrollment.programSnapshot || course?.title || '',
    createdAt: toIsoString(enrollment.createdAt),
    updatedAt: toIsoString(enrollment.updatedAt),
  };
}

function mapStudent(student, enrollment, course) {
  if (!student) {
    return null;
  }

  return {
    ...student,
    courseId: enrollment?.courseId ?? null,
    enrollmentId: enrollment?.id ?? null,
    program: enrollment?.programSnapshot || course?.title || '',
    paymentStatus: enrollment?.paymentStatus || 'pending',
    createdAt: toIsoString(student.createdAt),
    updatedAt: toIsoString(student.updatedAt),
  };
}

function buildAccountFromIdentity(authUser, profile, student, enrollment, course) {
  if (!authUser && !student) {
    return null;
  }

  const accountId = authUser?.accountId || student?.accountId || (authUser ? `auth-${authUser.id}` : null);
  return {
    id: accountId || student?.id || authUser?.id || null,
    accountId,
    username: authUser?.username || student?.nis || authUser?.email || '',
    loginId: authUser?.email || student?.email || '',
    role: profile?.role || authUser?.role || 'student',
    name: profile?.displayName || authUser?.name || student?.name || '',
    displayName: profile?.displayName || authUser?.name || student?.name || '',
    email: authUser?.email || student?.email || '',
    studentId: student?.id ?? toIntegerOrNull(authUser?.studentId) ?? profile?.studentId ?? null,
    nis: student?.nis || authUser?.nis || '',
    courseId: enrollment?.courseId ?? toIntegerOrNull(authUser?.courseId) ?? course?.id ?? null,
    enrollmentId: enrollment?.id ?? authUser?.enrollmentId ?? null,
    permissions: Array.isArray(profile?.permissions) ? profile.permissions : [],
    status: profile?.status || 'active',
  };
}

async function loadIdentityByAuthUser(database, authUser) {
  if (!authUser) {
    return null;
  }

  const [profile] = await database.select().from(userProfiles).where(eq(userProfiles.authUserId, authUser.id)).limit(1);
  const studentId = profile?.studentId ?? toIntegerOrNull(authUser.studentId);

  let student = null;
  if (studentId != null) {
    [student] = await database.select().from(students).where(eq(students.id, studentId)).limit(1);
  }

  if (!student) {
    [student] = await database.select().from(students).where(eq(students.authUserId, authUser.id)).limit(1);
  }

  const enrollmentRows = student
    ? await database.select().from(enrollments)
      .where(eq(enrollments.studentId, student.id))
      .orderBy(desc(enrollments.updatedAt), desc(enrollments.createdAt))
    : [];
  const enrollment = pickPrimaryEnrollment(enrollmentRows, authUser.enrollmentId);
  const courseId = enrollment?.courseId ?? toIntegerOrNull(authUser.courseId);
  const course = courseId != null
    ? (await database.select().from(courses).where(eq(courses.id, courseId)).limit(1))[0] || null
    : null;
  const mappedCourse = mapCourse(course);
  const mappedEnrollment = mapEnrollment(enrollment, mappedCourse);
  const mappedStudent = mapStudent(student, mappedEnrollment, mappedCourse);
  const account = buildAccountFromIdentity(authUser, profile || null, mappedStudent, mappedEnrollment, mappedCourse);
  const user = {
    ...buildSessionUser({
      account,
      student: mappedStudent,
      enrollment: mappedEnrollment,
      course: mappedCourse,
    }),
    authUserId: authUser.id,
  };

  return {
    authUser,
    profile: profile || null,
    student: mappedStudent,
    enrollment: mappedEnrollment,
    course: mappedCourse,
    account,
    user,
  };
}

async function countIdentifierRows(database, authUserId) {
  const rows = await database.select().from(loginIdentifiers).where(eq(loginIdentifiers.authUserId, authUserId));
  return rows.length;
}

function isIdentityLinkComplete(identity, identifierCount = 0) {
  if (!identity?.authUser || !identity?.student || !identity?.account) {
    return false;
  }

  const profileStudentId = identity.profile?.studentId == null
    ? null
    : Number(identity.profile.studentId);
  const authStudentId = toIntegerOrNull(identity.authUser.studentId);

  return String(identity.student.authUserId || '') === String(identity.authUser.id)
    && profileStudentId === Number(identity.student.id)
    && authStudentId === Number(identity.student.id)
    && identifierCount >= 2;
}

async function buildLinkRecoveryCandidate(database, authUser, identity = null) {
  if (!authUser) {
    return null;
  }

  const student = identity?.student
    || (authUser.studentId
      ? (await database.select().from(students).where(eq(students.id, Number(authUser.studentId))).limit(1))[0] || null
      : null)
    || (authUser.email
      ? (await database.select().from(students).where(eq(students.email, authUser.email)).limit(1))[0] || null
      : null)
    || (authUser.nis
      ? (await database.select().from(students).where(eq(students.nis, authUser.nis)).limit(1))[0] || null
      : null);

  if (!student) {
    return null;
  }

  const enrollmentRows = await database.select().from(enrollments)
    .where(eq(enrollments.studentId, student.id))
    .orderBy(desc(enrollments.updatedAt), desc(enrollments.createdAt));

  return {
    student: {
      ...student,
      authUserId: student.authUserId || authUser.id,
      accountId: student.accountId || authUser.accountId || `acc-student-${student.id}`,
    },
    enrollment: pickPrimaryEnrollment(enrollmentRows, authUser.enrollmentId),
  };
}

async function findAuthUserByIdentifier(database, identifier) {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);
  if (!normalizedIdentifier) {
    return null;
  }

  const [identifierRow] = await database.select().from(loginIdentifiers)
    .where(eq(loginIdentifiers.identifier, normalizedIdentifier))
    .limit(1);

  if (identifierRow?.authUserId) {
    return (await database.select().from(authUsers).where(eq(authUsers.id, identifierRow.authUserId)).limit(1))[0] || null;
  }

  let authUser = (await database.select().from(authUsers).where(eq(authUsers.email, normalizedIdentifier)).limit(1))[0] || null;
  if (authUser) {
    return authUser;
  }

  authUser = (await database.select().from(authUsers).where(eq(authUsers.username, normalizedIdentifier)).limit(1))[0] || null;
  if (authUser) {
    return authUser;
  }

  return (await database.select().from(authUsers).where(eq(authUsers.nis, normalizedIdentifier)).limit(1))[0] || null;
}

async function upsertIdentifierRows(tx, authUserId, authUser, student) {
  await tx.delete(loginIdentifiers).where(eq(loginIdentifiers.authUserId, authUserId));

  const now = new Date();
  const identifiers = [
    { type: 'email', identifier: normalizeLoginIdentifier(authUser.email), id: `${authUserId}:email` },
    { type: 'nis', identifier: normalizeLoginIdentifier(student?.nis), id: `${authUserId}:nis` },
    { type: 'username', identifier: normalizeLoginIdentifier(authUser.username), id: `${authUserId}:username` },
  ].filter((item) => item.identifier);

  if (identifiers.length === 0) {
    return;
  }

  await tx.insert(loginIdentifiers).values(identifiers.map((item) => ({
    id: item.id,
    authUserId,
    identifier: item.identifier,
    type: item.type,
    createdAt: now,
    updatedAt: now,
  })));
}

export function canUseDatabaseAuthPersistence() {
  return isDatabaseConfigured;
}

export async function findPersistedIdentityByAuthUserId(authUserId) {
  const normalizedAuthUserId = String(authUserId || '').trim();
  if (!normalizedAuthUserId || !canUseDatabaseAuthPersistence()) {
    return null;
  }

  const database = requireDb();
  const [authUser] = await database.select().from(authUsers).where(eq(authUsers.id, normalizedAuthUserId)).limit(1);
  const identity = await loadIdentityByAuthUser(database, authUser || null);
  const identifierCount = authUser ? await countIdentifierRows(database, normalizedAuthUserId) : 0;

  if (authUser && !isIdentityLinkComplete(identity, identifierCount)) {
    const recovery = await buildLinkRecoveryCandidate(database, authUser, identity);
    if (recovery?.student) {
      return finalizePersistedIdentityLink({
        authUserId: normalizedAuthUserId,
        student: recovery.student,
        enrollment: recovery.enrollment,
        role: identity?.profile?.role || authUser.role || 'student',
      });
    }
  }

  return identity;
}

export async function findPersistedIdentityByIdentifier(identifier) {
  if (!canUseDatabaseAuthPersistence()) {
    return null;
  }

  const database = requireDb();
  const authUser = await findAuthUserByIdentifier(database, identifier);
  return authUser ? findPersistedIdentityByAuthUserId(authUser.id) : null;
}

export async function ensurePersistedIdentityLink(reference = {}) {
  if (!canUseDatabaseAuthPersistence()) {
    return null;
  }

  if (reference.authUserId) {
    return findPersistedIdentityByAuthUserId(reference.authUserId);
  }

  if (reference.identifier) {
    return findPersistedIdentityByIdentifier(reference.identifier);
  }

  return null;
}

export async function finalizePersistedIdentityLink({
  authUserId,
  student,
  enrollment,
  role = 'student',
}) {
  if (!canUseDatabaseAuthPersistence()) {
    return null;
  }

  if (!student) {
    return null;
  }

  const database = requireDb();
  let normalizedAuthUserId = String(authUserId || '').trim();

  if (!normalizedAuthUserId) {
    const authUser = await findAuthUserByIdentifier(database, student.email || student.nis || '');
    normalizedAuthUserId = String(authUser?.id || '').trim();
  }

  if (!normalizedAuthUserId) {
    throw new Error('Auth user not found for registration finalization.');
  }

  await database.transaction(async (tx) => {
    const [authUser] = await tx.select().from(authUsers).where(eq(authUsers.id, normalizedAuthUserId)).limit(1);
    if (!authUser) {
      throw new Error('Auth user not found for registration finalization.');
    }

    const now = new Date();
    const nextAccountId = student.accountId || authUser.accountId || `acc-student-${student.id}`;
    const nextUsername = authUser.username || student.nis || authUser.email;

    await tx.update(authUsers)
      .set({
        name: student.name,
        email: student.email,
        username: nextUsername,
        role,
        studentId: String(student.id),
        nis: student.nis,
        accountId: nextAccountId,
        courseId: enrollment?.courseId != null ? String(enrollment.courseId) : authUser.courseId,
        enrollmentId: enrollment?.id || authUser.enrollmentId,
        updatedAt: now,
      })
      .where(eq(authUsers.id, normalizedAuthUserId));

    await tx.update(students)
      .set({
        authUserId: normalizedAuthUserId,
        accountId: nextAccountId,
        updatedAt: now,
      })
      .where(eq(students.id, student.id));

    await tx.insert(userProfiles).values({
      authUserId: normalizedAuthUserId,
      role,
      status: 'active',
      studentId: student.id,
      displayName: student.name,
      permissions: [],
      createdAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: userProfiles.authUserId,
      set: {
        role,
        status: 'active',
        studentId: student.id,
        displayName: student.name,
        updatedAt: now,
      },
    });

    const nextAuthUser = {
      ...authUser,
      email: student.email,
      username: nextUsername,
    };
    await upsertIdentifierRows(tx, normalizedAuthUserId, nextAuthUser, student);
  });

  return findPersistedIdentityByAuthUserId(normalizedAuthUserId);
}

export async function updatePersistedStudentProfile(reference = {}, payload = {}) {
  if (!canUseDatabaseAuthPersistence()) {
    return null;
  }

  const identity = reference.authUserId
    ? await findPersistedIdentityByAuthUserId(reference.authUserId)
    : await findPersistedIdentityByIdentifier(reference.email || reference.nis || '');

  if (!identity?.student) {
    return null;
  }

  const database = requireDb();
  const now = new Date();
  const nextEmail = normalizeLoginIdentifier(payload.email);

  await database.transaction(async (tx) => {
    const duplicateStudent = await tx.select().from(students).where(eq(students.email, nextEmail)).limit(1);
    if (duplicateStudent[0] && String(duplicateStudent[0].id) !== String(identity.student.id)) {
      throw new Error('EMAIL_ALREADY_USED');
    }

    await tx.update(students)
      .set({
        name: String(payload.name || '').trim(),
        email: nextEmail,
        phone: String(payload.phone || '').trim(),
        address: String(payload.address || '').trim(),
        updatedAt: now,
      })
      .where(eq(students.id, identity.student.id));
  });

  return finalizePersistedIdentityLink({
    authUserId: identity.authUser?.id,
    student: {
      ...identity.student,
      name: String(payload.name || '').trim(),
      email: nextEmail,
      phone: String(payload.phone || '').trim(),
      address: String(payload.address || '').trim(),
    },
    enrollment: identity.enrollment,
    role: identity.profile?.role || identity.authUser?.role || 'student',
  });
}
