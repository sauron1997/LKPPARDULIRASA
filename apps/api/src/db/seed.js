import { eq, sql } from 'drizzle-orm';
import {
  getDefaultAccreditations,
  getDefaultAccounts,
  getDefaultAssessmentDefinitions,
  getDefaultAssessmentProgress,
  getDefaultAssessmentSubmissions,
  getDefaultBlogPosts,
  getDefaultCertificates,
  getDefaultCourses,
  getDefaultEnrollments,
  getDefaultGalleryItems,
  getDefaultModules,
  getDefaultProfile,
  getDefaultPublicMessages,
  getDefaultStudentMessages,
  getDefaultStudents,
  getPublicSocialLinks,
} from '@lkp-parduli-rasa/domain/defaults';
import { normalizeLoginIdentifier } from '@lkp-parduli-rasa/domain/domain-relations';
import { auth } from '../auth/index.js';
import { env } from '../config/env.js';
import { finalizePersistedIdentityLink } from '../modules/auth/auth.persistence.js';
import { db, requireDb } from './client.js';
import {
  accreditations,
  authUsers,
  assessmentDefinitions,
  assessmentProgress,
  assessmentQuestions,
  assessmentSubmissions,
  blogPosts,
  certificates,
  courseModules,
  courses,
  enrollments,
  galleryItems,
  galleryMedia,
  loginIdentifiers,
  messageThreads,
  siteProfile,
  socialLinks,
  students,
  submissionAnswers,
  threadMessages,
  userProfiles,
} from './schema/index.js';

function flattenSubmissionAnswers(items) {
  return items.flatMap((submission) => (
    Array.isArray(submission.answers)
      ? submission.answers.map((answer, index) => ({
        id: `${submission.id}-answer-${index + 1}`,
        submissionId: submission.id,
        questionId: answer.questionId || `${submission.id}-question-${index + 1}`,
        value: answer.value ?? '',
      }))
      : []
  ));
}

function flattenQuestions(items) {
  return items.flatMap((definition) => (
    Array.isArray(definition.questions)
      ? definition.questions.map((question, index) => ({
        id: question.id || `${definition.id}-question-${index + 1}`,
        definitionId: definition.id,
        order: index + 1,
        kind: question.kind || 'essay',
        prompt: question.prompt || '',
        options: question.options || [],
        answer: question.answer ?? null,
        weight: Number(question.weight || 1),
      }))
      : []
  ));
}

function flattenThreadMessages(threads, channel) {
  return threads.flatMap((thread) => (
    Array.isArray(thread.messages)
      ? thread.messages.map((message) => ({
        id: String(message.id),
        threadId: String(thread.id),
        authorUserId: null,
        authorRole: String(message.authorRole || (channel === 'public' ? 'public' : 'student')),
        authorName: message.authorName || thread.senderName || 'Pengirim',
        body: message.body || '',
        createdAt: new Date(message.createdAt || thread.createdAt || thread.updatedAt || new Date().toISOString()),
      }))
      : []
  ));
}

async function resetTables(database) {
  await database.execute(sql`
    TRUNCATE TABLE
      "session",
      "account",
      "verification",
      "user",
      user_profiles,
      submission_answers,
      assessment_submissions,
      assessment_progress,
      assessment_questions,
      assessment_definitions,
      certificates,
      thread_messages,
      message_threads,
      course_modules,
      enrollments,
      students,
      login_identifiers,
      gallery_media,
      gallery_items,
      blog_posts,
      accreditations,
      courses,
      social_links,
      site_profile
    RESTART IDENTITY CASCADE
  `);
}

function buildSeedAuthHeaders() {
  return new Headers({
    origin: env.clientOrigin,
    referer: env.clientOrigin,
  });
}

function buildIdentifierRows(authUserId, account, student, now) {
  return [
    {
      id: `${authUserId}:email`,
      authUserId,
      identifier: normalizeLoginIdentifier(account?.email),
      type: 'email',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${authUserId}:username`,
      authUserId,
      identifier: normalizeLoginIdentifier(account?.username),
      type: 'username',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${authUserId}:nis`,
      authUserId,
      identifier: normalizeLoginIdentifier(student?.nis),
      type: 'nis',
      createdAt: now,
      updatedAt: now,
    },
  ].filter((item) => item.identifier);
}

async function provisionAuthAccount(database, account, student = null, enrollment = null) {
  const headers = buildSeedAuthHeaders();

  await auth.api.signUpEmail({
    body: {
      name: account.name,
      email: account.email,
      password: account.password,
      username: account.username || student?.nis || account.email,
      role: account.role || 'student',
      studentId: student?.id != null ? String(student.id) : undefined,
      nis: student?.nis || account.nis || undefined,
      accountId: account.id || account.accountId,
      courseId: enrollment?.courseId != null ? String(enrollment.courseId) : (account.courseId != null ? String(account.courseId) : undefined),
      enrollmentId: enrollment?.id || account.enrollmentId || undefined,
    },
    headers,
  });

  const [authUser] = await database.select().from(authUsers).where(eq(authUsers.email, account.email)).limit(1);
  if (!authUser) {
    throw new Error(`Auth user provisioning failed for ${account.email}.`);
  }

  if (student) {
    return finalizePersistedIdentityLink({
      authUserId: authUser.id,
      student,
      enrollment,
      role: account.role || 'student',
    });
  }

  const now = new Date();
  const identifierRows = buildIdentifierRows(authUser.id, account, student, now);

  await database.transaction(async (tx) => {
    await tx.update(authUsers)
      .set({
        name: account.name,
        email: account.email,
        username: account.username || authUser.username || account.email,
        role: account.role || 'admin',
        accountId: account.id || account.accountId || authUser.accountId,
        updatedAt: now,
      })
      .where(eq(authUsers.id, authUser.id));

    await tx.insert(userProfiles).values({
      authUserId: authUser.id,
      role: account.role || 'admin',
      status: account.status || 'active',
      studentId: null,
      displayName: account.displayName || account.name,
      permissions: Array.isArray(account.permissions) ? account.permissions : ['*'],
      createdAt: now,
      updatedAt: now,
    });

    if (identifierRows.length > 0) {
      await tx.insert(loginIdentifiers).values(identifierRows);
    }
  });

  return authUser;
}

export async function seedDatabase() {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const database = requireDb();
  const profile = getDefaultProfile();
  const social = getPublicSocialLinks(profile);
  const seedAccounts = getDefaultAccounts();
  const seedCourses = getDefaultCourses();
  const seedModules = getDefaultModules();
  const seedStudents = getDefaultStudents();
  const seedEnrollments = getDefaultEnrollments();
  const seedDefinitions = getDefaultAssessmentDefinitions();
  const seedProgress = getDefaultAssessmentProgress();
  const seedSubmissions = getDefaultAssessmentSubmissions();
  const seedCertificates = getDefaultCertificates();
  const seedBlogPosts = getDefaultBlogPosts();
  const seedGallery = getDefaultGalleryItems();
  const seedAccreditations = getDefaultAccreditations();
  const publicThreads = getDefaultPublicMessages();
  const studentThreads = getDefaultStudentMessages();

  await resetTables(database);

  await database.insert(siteProfile).values({
    id: 'site',
    name: profile.name,
    tagline: profile.tagline,
    logo: profile.logo,
    description: profile.description,
    vision: profile.vision,
    mission: profile.mission,
    history: profile.history,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
    foundedYear: profile.foundedYear,
    teacherCount: profile.teacherCount,
    alumniCount: profile.alumniCount,
    updatedAt: new Date(profile.updatedAt || new Date().toISOString()),
  });

  await database.insert(socialLinks).values(Object.entries(social).map(([platform, value]) => ({
    id: platform,
    platform,
    url: value.url || '',
    enabled: value.enabled ? 'true' : 'false',
    updatedAt: new Date(profile.updatedAt || new Date().toISOString()),
  })));

  await database.insert(courses).values(seedCourses.map((course) => ({
    id: Number(course.id),
    slug: course.slug || String(course.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    title: course.title,
    aliases: course.aliases || [],
    description: course.description || '',
    icon: course.icon || 'FileText',
    priceValue: Number(course.priceValue || 0),
    priceLabel: course.priceLabel || '',
    duration: course.duration || '',
    level: course.level || 'Umum',
    brochureMediaId: null,
    isPublished: 'true',
    createdAt: new Date(course.createdAt || new Date().toISOString()),
    updatedAt: new Date(course.updatedAt || course.createdAt || new Date().toISOString()),
  })));

  await database.insert(courseModules).values(seedModules.map((item) => ({
    id: item.id,
    courseId: Number(item.courseId),
    order: Number(item.order || 1),
    title: item.title,
    summary: item.summary || '',
    durationLabel: item.durationLabel || '',
    fileMediaId: null,
    resourceType: item.resourceType || 'lesson',
    isPublished: item.isPublished === false ? 'false' : 'true',
    createdAt: new Date(item.createdAt || new Date().toISOString()),
    updatedAt: new Date(item.updatedAt || item.createdAt || new Date().toISOString()),
  })));

  await database.insert(students).values(seedStudents.map((student) => ({
    id: Number(student.id),
    authUserId: null,
    accountId: student.accountId || null,
    nis: student.nis,
    name: student.name,
    email: student.email,
    phone: student.phone || '',
    address: student.address || '',
    status: student.status || 'Aktif',
    identityMediaId: null,
    registrationDate: student.registrationDate || null,
    notes: student.notes || '',
    createdAt: new Date(student.createdAt || new Date().toISOString()),
    updatedAt: new Date(student.updatedAt || student.createdAt || new Date().toISOString()),
  })));

  await database.insert(enrollments).values(seedEnrollments.map((item) => ({
    id: item.id,
    studentId: Number(item.studentId),
    courseId: Number(item.courseId),
    programSnapshot: item.program || item.courseTitle || '',
    status: item.status || 'active',
    paymentStatus: item.paymentStatus || 'pending',
    paymentDate: item.paymentDate || null,
    registrationDate: item.registrationDate || null,
    startedAt: item.startedAt || null,
    completedAt: item.completedAt || null,
    currentModuleId: item.currentModuleId || null,
    progressPercent: Number(item.progressPercent || 0),
    notes: item.notes || '',
    createdAt: new Date(item.createdAt || new Date().toISOString()),
    updatedAt: new Date(item.updatedAt || item.createdAt || new Date().toISOString()),
  })));

  const enrollmentsByStudentId = new Map(seedEnrollments.map((item) => [String(item.studentId), item]));
  const studentsById = new Map(seedStudents.map((student) => [String(student.id), student]));
  const adminAccount = seedAccounts.find((account) => String(account.role || '').toLowerCase() === 'admin') || null;
  const studentAccounts = seedAccounts.filter((account) => String(account.role || '').toLowerCase() === 'student');

  if (adminAccount) {
    await provisionAuthAccount(database, adminAccount);
  }

  for (const account of studentAccounts) {
    const student = studentsById.get(String(account.studentId || ''));
    if (!student) {
      continue;
    }

    await provisionAuthAccount(
      database,
      account,
      student,
      enrollmentsByStudentId.get(String(student.id)) || null,
    );
  }

  await database.insert(assessmentDefinitions).values(seedDefinitions.map((item) => ({
    id: item.id,
    courseId: Number(item.courseId),
    type: item.type,
    title: item.title,
    summary: item.summary || item.description || '',
    instructions: Array.isArray(item.instructions) ? item.instructions.join('\n') : item.instructions || '',
    durationMinutes: Number(item.durationMinutes || 60),
    passingScore: Number(item.passingScore || 75),
    maxScore: Number(item.maxScore || 100),
    maxAttempts: Number(item.maxAttempts || 1),
    allowRetry: item.allowRetry === false ? 'false' : 'true',
    submissionMode: item.submissionMode || 'online_quiz',
    allowedExtensions: item.allowedExtensions || [],
    isPublished: item.isPublished === false ? 'false' : 'true',
    createdAt: new Date(item.createdAt || new Date().toISOString()),
    updatedAt: new Date(item.updatedAt || item.createdAt || new Date().toISOString()),
  })));

  await database.insert(assessmentQuestions).values(flattenQuestions(seedDefinitions));

  await database.insert(assessmentProgress).values(seedProgress.map((item) => ({
    id: item.id,
    enrollmentId: item.enrollmentId,
    studentId: Number(item.studentId),
    courseId: Number(item.courseId),
    type: item.type,
    assessmentTitle: item.assessmentTitle || item.type,
    status: item.status || 'not_started',
    score: item.score == null ? null : Number(item.score),
    maxScore: Number(item.maxScore || 100),
    submittedAt: item.submittedAt ? new Date(item.submittedAt) : null,
    completedAt: item.completedAt ? new Date(item.completedAt) : null,
    feedback: item.feedback || '',
    notes: item.notes || '',
    createdAt: new Date(item.createdAt || new Date().toISOString()),
    updatedAt: new Date(item.updatedAt || item.createdAt || new Date().toISOString()),
  })));

  await database.insert(assessmentSubmissions).values(seedSubmissions.map((item) => ({
    id: item.id,
    definitionId: item.definitionId,
    enrollmentId: item.enrollmentId,
    studentId: Number(item.studentId),
    courseId: Number(item.courseId),
    type: item.type,
    title: item.title || '',
    attempt: Number(item.attempt || 1),
    status: item.status || 'draft',
    score: item.score == null ? null : Number(item.score),
    maxScore: Number(item.maxScore || 100),
    feedback: item.feedback || item.notes || '',
    reviewerName: item.reviewerName || '',
    submittedAt: item.submittedAt ? new Date(item.submittedAt) : null,
    reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : null,
    createdAt: new Date(item.createdAt || new Date().toISOString()),
    updatedAt: new Date(item.updatedAt || item.createdAt || new Date().toISOString()),
  })));

  await database.insert(submissionAnswers).values(flattenSubmissionAnswers(seedSubmissions));

  await database.insert(certificates).values(seedCertificates.map((item) => ({
    id: String(item.id),
    studentId: Number(item.studentId),
    enrollmentId: item.enrollmentId,
    courseId: Number(item.courseId),
    nis: item.nis,
    studentName: item.studentName,
    program: item.program || '',
    issueDate: item.issueDate || null,
    status: item.status || 'available',
    fileMediaId: null,
    eligibilitySnapshot: {},
    notes: item.notes || '',
    createdAt: new Date(item.updatedAt || new Date().toISOString()),
    updatedAt: new Date(item.updatedAt || new Date().toISOString()),
  })));

  await database.insert(blogPosts).values(seedBlogPosts.map((post) => ({
    id: Number(post.id),
    slug: post.slug,
    title: post.title,
    summary: post.summary || '',
    contentHtml: post.content || '',
    authorName: post.author || 'Admin LKP',
    category: post.category || 'Edukasi',
    status: post.status || 'published',
    coverMediaId: null,
    tags: post.tags || [],
    publishedAt: new Date(post.publishedAt || post.createdAt || new Date().toISOString()),
    createdAt: new Date(post.createdAt || new Date().toISOString()),
    updatedAt: new Date(post.updatedAt || post.createdAt || new Date().toISOString()),
  })));

  await database.insert(galleryItems).values(seedGallery.map((item) => ({
    id: Number(item.id),
    title: item.title,
    description: item.description || '',
    tags: item.tags || [],
    coverId: item.coverId || null,
    type: item.type || 'photo',
    createdAt: new Date(item.createdAt || new Date().toISOString()),
    updatedAt: new Date(item.updatedAt || item.createdAt || new Date().toISOString()),
  })));

  await database.insert(galleryMedia).values(seedGallery.flatMap((item) => (
    Array.isArray(item.media)
      ? item.media.map((media) => ({
        id: media.id,
        galleryItemId: Number(item.id),
        name: media.name || item.title,
        type: media.type || 'photo',
        url: media.url || '',
        mimeType: media.mimeType || '',
        isObjectUrl: media.isObjectUrl ? 'true' : 'false',
      }))
      : []
  )));

  await database.insert(accreditations).values(seedAccreditations.map((item) => ({
    id: Number(item.id),
    title: item.title,
    certificateNumber: item.certificateNumber || '',
    description: item.description || '',
    expiryDate: item.expiryDate || '',
    year: item.year || '',
    status: item.status || 'Aktif',
    documentMediaId: null,
    documentName: item.documentName || '',
    updatedAt: new Date(item.updatedAt || new Date().toISOString()),
  })));

  const combinedThreads = [
    ...publicThreads.map((thread) => ({ ...thread, channel: 'public' })),
    ...studentThreads.map((thread) => ({ ...thread, channel: 'student' })),
  ];

  await database.insert(messageThreads).values(combinedThreads.map((thread) => ({
    id: String(thread.id),
    channel: thread.channel,
    studentId: thread.studentId == null ? null : Number(thread.studentId),
    enrollmentId: thread.enrollmentId || null,
    courseId: thread.courseId == null ? null : Number(thread.courseId),
    senderName: thread.senderName || thread.studentName || '',
    senderEmail: thread.senderEmail || '',
    senderAddress: thread.senderAddress || '',
    subject: thread.subject || '',
    status: thread.status || 'unread',
    draft: thread.draft || '',
    lastMessageAt: thread.updatedAt ? new Date(thread.updatedAt) : new Date(),
    createdAt: thread.createdAt ? new Date(thread.createdAt) : new Date(),
    updatedAt: thread.updatedAt ? new Date(thread.updatedAt) : new Date(),
  })));

  await database.insert(threadMessages).values([
    ...flattenThreadMessages(publicThreads, 'public'),
    ...flattenThreadMessages(studentThreads, 'student'),
  ]);

  return {
    seeded: {
      courses: seedCourses.length,
      modules: seedModules.length,
      students: seedStudents.length,
      enrollments: seedEnrollments.length,
      assessmentDefinitions: seedDefinitions.length,
      assessmentProgress: seedProgress.length,
      assessmentSubmissions: seedSubmissions.length,
      blogPosts: seedBlogPosts.length,
      galleryItems: seedGallery.length,
      accreditations: seedAccreditations.length,
      publicMessages: publicThreads.length,
      studentMessages: studentThreads.length,
    },
  };
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedDatabase()
    .then((result) => {
      console.log('Database seed complete.');
      console.log(JSON.stringify(result, null, 2));
      return db?.$client?.end?.();
    })
    .catch((error) => {
      console.error('Database seed failed.');
      console.error(error);
      process.exitCode = 1;
    });
}
