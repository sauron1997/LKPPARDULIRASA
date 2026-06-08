import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCertificateUseCases } from '../src/use-cases/certificate.usecase.js';
import { buildFakeDeps } from './helpers/fake-repos.mjs';

describe('certificate.usecase.js', () => {
  let deps;
  let useCases;
  let seed;

  beforeEach(() => {
    deps = buildFakeDeps();
    seed = deps._seed;
    useCases = createCertificateUseCases(deps);
  });

  describe('listCertificates()', () => {
    it('returns empty array when no certificates', async () => {
      const result = await useCases.listCertificates();
      assert(Array.isArray(result));
      assert.equal(result.length, 0);
    });

    it('returns certificates after upsert', async () => {
      await useCases.upsertCertificate(seed.student.id, { issueDate: '2024-06-01' });
      const result = await useCases.listCertificates();
      assert(result.length >= 1);
    });

    it('filters by studentId', async () => {
      await useCases.upsertCertificate(seed.student.id, {});
      const result = await useCases.listCertificates({ studentId: seed.student.id });
      assert(result.every((c) => String(c.studentId) === String(seed.student.id)));
    });
  });

  describe('upsertCertificate()', () => {
    it('creates a new certificate for existing student', async () => {
      const cert = await useCases.upsertCertificate(seed.student.id, {
        issueDate: '2024-06-01',
        status: 'available',
      });
      assert(cert.id, 'should have an id');
      assert.equal(cert.studentId, seed.student.id);
      assert.equal(cert.issueDate, '2024-06-01');
    });

    it('updates existing certificate on second call', async () => {
      await useCases.upsertCertificate(seed.student.id, { notes: 'First' });
      const updated = await useCases.upsertCertificate(seed.student.id, { notes: 'Updated' });
      assert.equal(updated.notes, 'Updated');
    });

    it('throws for non-existent student', async () => {
      await assert.rejects(
        () => useCases.upsertCertificate(99999, {}),
        (err) => err.status === 404 || err.code?.includes('NOT_FOUND'),
      );
    });
  });

  describe('deleteCertificate()', () => {
    it('removes certificate by id', async () => {
      const cert = await useCases.upsertCertificate(seed.student.id, {});
      const result = await useCases.deleteCertificate(cert.id);
      assert(result, 'should return truthy');
      const list = await useCases.listCertificates();
      assert.equal(list.length, 0);
    });
  });

  describe('checkEligibility()', () => {
    it('returns eligibility status for student', async () => {
      const result = await useCases.checkEligibility(seed.student.id);
      assert(result !== undefined, 'should return something');
    });
  });
});
