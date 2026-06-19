import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createStudentUseCases } from '../src/use-cases/student.usecase.js';
import { buildFakeDeps } from './helpers/fake-repos.mjs';

describe('student.usecase.js', () => {
  let deps;
  let useCases;
  let seed;

  beforeEach(() => {
    deps = buildFakeDeps();
    seed = deps._seed;
    useCases = createStudentUseCases(deps);
  });

  describe('listStudents()', () => {
    it('returns all students when no filters', async () => {
      const result = await useCases.listStudents();
      assert(Array.isArray(result.students));
      assert(result.students.length >= 1);
      assert.equal(result.total, result.students.length);
    });

    it('filters by status', async () => {
      const result = await useCases.listStudents({ status: 'Aktif' });
      assert(result.students.every((s) => s.status === 'Aktif'));
    });

    it('returns empty when no match', async () => {
      const result = await useCases.listStudents({ status: 'NonExistent' });
      assert(Array.isArray(result.students));
      assert.equal(result.students.length, 0);
    });
  });

  describe('getStudent()', () => {
    it('returns student with account and enrollment', async () => {
      const result = await useCases.getStudent(seed.student.id);
      assert(result, 'should return a result');
      assert.equal(result.id ?? result.student?.id, seed.student.id);
    });

    it('throws 404 for non-existent student', async () => {
      await assert.rejects(
        () => useCases.getStudent(99999),
        (err) => err.status === 404 || err.code?.includes('NOT_FOUND'),
      );
    });
  });

  describe('updateStudent()', () => {
    it('updates student name', async () => {
      const updated = await useCases.updateStudent(seed.student.id, { name: 'Nama Baru' });
      assert(updated);
      const found = await deps.studentRepo.getById(seed.student.id);
      assert.equal(found.name, 'Nama Baru');
    });

    it('throws 404 for non-existent student', async () => {
      await assert.rejects(
        () => useCases.updateStudent(99999, { name: 'Test' }),
        (err) => err.status === 404 || err.code?.includes('NOT_FOUND'),
      );
    });
  });

  describe('updatePaymentStatus()', () => {
    it('updates payment status to verified', async () => {
      const result = await useCases.updatePaymentStatus(seed.student.id, {
        paymentStatus: 'verified',
        paymentDate: '2024-06-01',
      });
      assert(result, 'should return updated student');
    });

    it('throws when paymentStatus is missing', async () => {
      await assert.rejects(
        () => useCases.updatePaymentStatus(seed.student.id, {}),
        (err) => err.status >= 400,
      );
    });
  });

  describe('findAccountByIdentifier()', () => {
    it('finds account by email', async () => {
      const result = await useCases.findAccountByIdentifier(seed.account.email);
      assert(result, 'should find account');
    });

    it('returns null for unknown identifier', async () => {
      const result = await useCases.findAccountByIdentifier('unknown@unknown.com');
      assert.equal(result, null);
    });
  });
});
