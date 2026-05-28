import { createAdminService } from '../admin/admin.service.js';
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

export function createExportsService(options = {}) {
  const adminService = createAdminService(options);
  const context = adminService.getContext();
  const { repositories } = context;

  return {
    exportStudents(filters = {}) {
      const rows = adminService.listStudents(filters).map((bundle) => ({
        studentId: bundle.student.id,
        nis: bundle.student.nis,
        name: bundle.student.name,
        email: bundle.student.email,
        phone: bundle.student.phone,
        program: bundle.course?.title || bundle.student.program,
        paymentStatus: bundle.enrollment?.paymentStatus || bundle.student.paymentStatus,
        progressPercent: bundle.portal.learning.completionPercent,
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
        .map((thread) => adminService.normalizeThread(thread))
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

    exportCertificates(filters = {}) {
      const rows = adminService.listCertificates(filters).map((certificate) => ({
        certificateId: certificate.id,
        studentId: certificate.studentId,
        nis: certificate.nis,
        studentName: certificate.studentName,
        program: certificate.program,
        issueDate: certificate.issueDate,
        status: certificate.status,
        fileName: certificate.fileName || '',
      }));

      return buildExportPayload('certificates-export', rows, filters.format || 'json');
    },
  };
}

export default createExportsService;
