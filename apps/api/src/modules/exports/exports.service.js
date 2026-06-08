/**
 * Exports Service — zero dependency on legacy admin.service.js (Phase 8migration).
 */
import { createBackendContext } from '../../runtime/backend-context.js';
import { createRepoAdapter } from '../../adapters/repository-adapter.js';
import { createDashboardQuery } from '@lkp-parduli-rasa/domain/use-cases';
import { normalizeThreadMessages } from '@lkp-parduli-rasa/domain/domain-relations';
import {
  canUseMessageDatabasePersistence,
  listPersistedMessageThreads,
} from '../messages/messages.persistence.js';

function escapeCsvValue(value) {
  const raw = value == null ? '' : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function rowsToCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => escapeCsvValue(row[key])).join(',')),
  ];
  return lines.join('\n');
}

function buildExportPayload(fileBaseName, rows, format = 'json') {
  if (format === 'csv') {
    return {
      fileName: `${fileBaseName}.csv`,
      contentType: 'text/csv; charset=utf-8',
      format: 'csv',
      rows,
      content: rowsToCsv(rows),
    };
  }
  return {
    fileName: `${fileBaseName}.json`,
    contentType: 'application/json; charset=utf-8',
    format: 'json',
    rows,
    content: JSON.stringify(rows, null, 2),
  };
}

function normalizeThread(thread) {
  const normalized = normalizeThreadMessages(thread);
  return {
    ...thread,
    body: normalized.body,
    messages: normalized.messages,
    responses: normalized.responses,
    updatedAt: thread.updatedAt || normalized.lastMessageAt,
    lastMessageAt: thread.lastMessageAt || normalized.lastMessageAt,
    lastMessagePreview: thread.lastMessagePreview || normalized.messages.at(-1)?.body || normalized.body,
  };
}

export function createExportsService(options = {}) {
  const context = createBackendContext(options);
  const repos = createRepoAdapter(context);
  const dashboard = createDashboardQuery({
    studentRepo: repos.studentRepo,
    courseRepo: repos.courseRepo,
    enrollmentRepo: repos.enrollmentRepo,
    scheduleSessionRepo: repos.scheduleSessionRepo,
    scheduleAssignmentRepo: repos.scheduleAssignmentRepo,
    attendanceRepo: repos.attendanceRepo,
    certificateRepo: repos.certificateRepo,
    assessmentRepo: repos.assessmentRepo,
    messageRepo: repos.messageRepo,
    blogRepo: repos.blogRepo,
  });
  const { repositories } = context;

  return {
    async exportStudents(filters = {}) {
      const ops = await dashboard.buildLearningOps();
      let bundles = ops.classBundles;

      if (filters.search) {
        const q = String(filters.search).trim().toLowerCase();
        bundles = bundles.filter((b) => {
          const haystack = `${b.student.name} ${b.student.nis} ${b.student.email} ${b.course?.title || ''}`.toLowerCase();
          return haystack.includes(q);
        });
      }

      const rows = bundles.map((bundle) => ({
        studentId: bundle.student.id,
        nis: bundle.student.nis,
        name: bundle.student.name,
        email: bundle.student.email,
        phone: bundle.student.phone || '',
        program: bundle.course?.title || bundle.student.program || '',
        paymentStatus: bundle.enrollment?.paymentStatus || bundle.student.paymentStatus ||'pending',
        progressPercent: bundle.completionPercent || 0,
        reviewCount: bundle.reviewCount,
        retryCount: bundle.retryCount,
        certificateEligible: bundle.gate.eligible ? 'yes' : 'no',
      }));

      return buildExportPayload('students-export', rows, filters.format || 'json');
    },

    async exportMessages(filters = {}) {
      const channel = filters.channel === 'student' ? 'student' : 'public';
      const sourceThreads = canUseMessageDatabasePersistence()
        ? await listPersistedMessageThreads(channel)
        : (channel === 'student'
          ? repositories.studentMessages.list()
          : repositories.publicMessages.list());

      const rows = sourceThreads
        .map((thread) => normalizeThread(thread))
        .map((thread) => ({
          threadId: thread.id,
          channel,
          senderName: thread.senderName,
          senderEmail: thread.senderEmail || '',
          subject: thread.subject || '',
          status: thread.status,
          lastMessageAt: thread.lastMessageAt || thread.updatedAt,
          messageCount: Array.isArray(thread.messages) ? thread.messages.length : 0,
        }));

      return buildExportPayload(`${channel}-messages-export`, rows, filters.format || 'json');
    },

    async exportCertificates(filters = {}) {
      const allCerts = repositories.certificates.list();
      let certs = allCerts;
      if (filters.studentId) {
        certs = certs.filter((c) => String(c.studentId) === String(filters.studentId));
      }

      const rows = certs.map((certificate) => ({
        certificateId: certificate.id,
        studentId: certificate.studentId,
        nis: certificate.nis,
        studentName: certificate.studentName,
        program: certificate.program || '',
        issueDate: certificate.issueDate || '',
        status: certificate.status,
        fileName: certificate.fileName || '',
      }));

      return buildExportPayload('certificates-export', rows, filters.format || 'json');
    },
  };
}

export default createExportsService;