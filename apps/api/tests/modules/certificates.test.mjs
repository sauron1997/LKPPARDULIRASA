import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetBackendState } from '../../src/runtime/backend-context.js';
import { createCertificatesService } from '../../src/modules/assessments/certificates.service.js';
import { buildStudentFixture } from '../helpers/test-context.mjs';

describe('assessments/certificates.service.js', () => {
  let svc;
  let fixture;

  beforeEach(() => {
    fixture = buildStudentFixture();
    svc = createCertificatesService({ state: fixture.context.state });
  });

  describe('listCertificates()', () => {
    it('returns empty list when no certificates exist', async () => {
      const certs = await svc.listCertificates();
      assert(Array.isArray(certs));
    });

    it('returns certificates sorted by updatedAt desc', async () => {
      const ctx = fixture.context;
      ctx.repositories.certificates.insert({ id: 'cert-old', studentId: fixture.student.id, updatedAt: '2024-01-01' });
      ctx.repositories.certificates.insert({ id: 'cert-new', studentId: fixture.student.id, updatedAt: '2024-06-01' });
      const certs = await svc.listCertificates();
      assert(certs.length >= 2);
      // Verify sort order: newer updatedAt comes first
      const certNew = certs.find((c) => c.id === 'cert-new');
      const certOld = certs.find((c) => c.id === 'cert-old');
      assert(certNew, 'cert-new should exist');
      assert(certOld, 'cert-old should exist');
      const newIdx = certs.indexOf(certNew);
      const oldIdx = certs.indexOf(certOld);
      assert(newIdx < oldIdx, 'cert-new should appear before cert-old (newer first)');
    });

    it('filters by studentId when provided', async () => {
      const ctx = fixture.context;
      ctx.repositories.certificates.insert({ id: 'cert-s1', studentId: fixture.student.id, updatedAt: '2024-01-01' });
      ctx.repositories.certificates.insert({ id: 'cert-s2', studentId: 9999, updatedAt: '2024-02-01' });
      const certs = await svc.listCertificates({ studentId: fixture.student.id });
      assert(certs.every((c) => String(c.studentId) === String(fixture.student.id)));
    });
  });

  describe('upsertCertificate()', () => {
    it('creates a new certificate for valid student', async () => {
      const cert = await svc.upsertCertificate(fixture.student.id, { issueDate: '2024-06-01' });
      assert(cert.id);
      assert.equal(cert.studentId, fixture.student.id);
      assert.equal(cert.issueDate, '2024-06-01');
    });

    it('updates existing certificate on second call', async () => {
      await svc.upsertCertificate(fixture.student.id, { notes: 'First' });
      const updated = await svc.upsertCertificate(fixture.student.id, { notes: 'Second' });
      assert.equal(updated.notes, 'Second');
    });

    it('throws for non-existent student', async () => {
      await assert.rejects(
        () => svc.upsertCertificate(99999, {}),
        (err) => err.code === 'STUDENT_NOT_FOUND',
      );
    });
  });

  describe('deleteCertificate()', () => {
    it('removes existing certificate and returns truthy', async () => {
      const cert = await svc.upsertCertificate(fixture.student.id, {});
      const result = await svc.deleteCertificate(cert.id);
      assert(result);
    });

    it('returns falsy for non-existent certificate', async () => {
      const result = await svc.deleteCertificate('non-existent-cert');
      assert(!result);
    });
  });
});
