import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBackendContext, resetBackendState, getBackendState } from '../../src/runtime/backend-context.js';

describe('runtime/backend-context.js', () => {
  describe('createBackendContext()', () => {
    it('returns context with repositories, getCollections, getIndexes, now', () => {
      resetBackendState();
      const ctx = createBackendContext();
      assert(ctx.repositories, 'missing repositories');
      assert(typeof ctx.getCollections === 'function', 'missing getCollections');
      assert(typeof ctx.getIndexes === 'function', 'missing getIndexes');
      assert(typeof ctx.now === 'function', 'missing now');
    });

    it('repositories have standard array repo methods', () => {
      resetBackendState();
      const ctx = createBackendContext();
      const repo = ctx.repositories.students;
      assert(typeof repo.list === 'function');
      assert(typeof repo.raw === 'function');
      assert(typeof repo.getById === 'function');
      assert(typeof repo.insert === 'function');
      assert(typeof repo.update === 'function');
      assert(typeof repo.remove === 'function');
    });

    it('insert + getById roundtrip works', () => {
      resetBackendState();
      const ctx = createBackendContext();
      const record = { id: 'test-cert-1', studentId: 1, name: 'Test' };
      ctx.repositories.certificates.insert(record);
      const found = ctx.repositories.certificates.getById('test-cert-1');
      assert.equal(found.id, 'test-cert-1');
      assert.equal(found.name, 'Test');
    });

    it('update modifies existing record', () => {
      resetBackendState();
      const ctx = createBackendContext();
      ctx.repositories.certificates.insert({ id: 'cert-u1', name: 'Before' });
      ctx.repositories.certificates.update('cert-u1', { name: 'After' });
      const updated = ctx.repositories.certificates.getById('cert-u1');
      assert.equal(updated.name, 'After');
    });

    it('remove deletes record', () => {
      resetBackendState();
      const ctx = createBackendContext();
      ctx.repositories.certificates.insert({ id: 'cert-r1', name: 'ToDelete' });
      ctx.repositories.certificates.remove('cert-r1');
      const found = ctx.repositories.certificates.getById('cert-r1');
      assert.equal(found, null);
    });
  });

  describe('resetBackendState()', () => {
    it('clears all custom state', () => {
      const state1 = getBackendState();
      state1.students = [{ id: 'custom-student' }];
      resetBackendState();
      const ctx = createBackendContext();
      const customStudent = ctx.repositories.students.raw().find((s) => s.id === 'custom-student');
      assert.equal(customStudent, undefined);
    });
  });

  describe('getIndexes()', () => {
    it('builds student indexes', () => {
      resetBackendState();
      const ctx = createBackendContext();
      ctx.repositories.students.insert({ id: 99, email: 'idx@test.com', nis: 'NIS-001' });
      const indexes = ctx.getIndexes();
      assert(indexes.studentsById.has('99'), 'studentsById should have entry');
    });
  });

  describe('now()', () => {
    it('returns ISO timestamp string', () => {
      resetBackendState();
      const ctx = createBackendContext();
      const ts = ctx.now();
      assert(typeof ts === 'string');
      assert(!Number.isNaN(Date.parse(ts)));
    });
  });
});
