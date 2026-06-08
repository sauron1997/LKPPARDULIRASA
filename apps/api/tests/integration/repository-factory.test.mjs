import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createBackendContext, resetBackendState } from '../../src/runtime/backend-context.js';
import { createRepositories, createDrizzleRepositories, isDatabaseConfigured } from '../../src/repositories/index.js';

describe('repositories/index.js — createRepositories() factory', () => {
  let context;

  beforeEach(() => {
    resetBackendState();
    context = createBackendContext();
  });

  describe('Memory mode (forceInMemory: true)', () => {
    it('returns type "memory" with repos object', () => {
      const result = createRepositories({ backendContext: context, forceInMemory: true });
      assert.equal(result.type, 'memory');
      assert(result.repos, 'should have repos');
    });

    it('memory repos have expected interface methods', () => {
      const { repos } = createRepositories({ backendContext: context, forceInMemory: true });
      // Check at least one repo has the standard interface
      const repoNames = Object.keys(repos);
      assert(repoNames.length > 0, 'should have at least one repo');

      // Student repo should have standard methods
      const studentRepo = repos.studentRepo;
      assert(studentRepo, 'should have studentRepo');
      assert(typeof studentRepo.list === 'function', 'list');
      assert(typeof studentRepo.getById === 'function', 'getById');
      assert(typeof studentRepo.insert === 'function', 'insert');
      assert(typeof studentRepo.update === 'function', 'update');
      assert(typeof studentRepo.remove === 'function', 'remove');
    });

    it('throws when forceInMemory=true but no backendContext', () => {
      assert.throws(
        () => createRepositories({ forceInMemory: true }),
        (err) => err.message.includes('forceInMemory'),
      );
    });
  });

  describe('Fallback to memory (no DATABASE_URL, with backendContext)', () => {
    it('selects memory mode when isDatabaseConfigured is false', () => {
      // In test environment, DATABASE_URL is typically not set
      if (isDatabaseConfigured) {
        // Skip — we can't test this path when DB is configured
        return;
      }
      const result = createRepositories({ backendContext: context });
      assert.equal(result.type, 'memory');
    });
  });

  describe('No configuration at all', () => {
    it('throws clear error when no DB and no context', () => {
      if (isDatabaseConfigured) {
        // When DB is configured, it won't throw — skip
        return;
      }
      assert.throws(
        () => createRepositories({}),
        (err) => err.message.includes('Repository configuration error'),
      );
    });
  });

  describe('createDrizzleRepositories()', () => {
    it('throws when no db instance and DATABASE_URL not configured', () => {
      if (isDatabaseConfigured) {
        // When DB is configured, this won't throw — skip
        return;
      }
      assert.throws(
        () => createDrizzleRepositories(null),
        (err) => err.message.includes('DATABASE_URL'),
      );
    });
  });

  describe('Memory repos CRUD roundtrip', () => {
    it('can insert and retrieve a student record', () => {
      const { repos } = createRepositories({ backendContext: context, forceInMemory: true });
      const student = { id: 999, name: 'Test Student', email: 'test@test.com' };
      repos.studentRepo.insert(student);
      const found = repos.studentRepo.getById(999);
      assert(found, 'should find inserted student');
      assert.equal(found.name, 'Test Student');
    });

    it('can list all students including defaults', () => {
      const { repos } = createRepositories({ backendContext: context, forceInMemory: true });
      const students = repos.studentRepo.list();
      assert(Array.isArray(students));
      // Default seed has students
      assert(students.length > 0, 'should have default seed students');
    });

    it('update method exists and is callable', () => {
      const { repos } = createRepositories({ backendContext: context, forceInMemory: true });
      // Verify update interface exists; actual CRUD roundtrip tested in backend-context.test.mjs
      assert(typeof repos.studentRepo.update === 'function', 'update should be a function');
      // Verify no crash when calling update on existing seed data
      const students = repos.studentRepo.list();
      if (students.length > 0) {
        const result = repos.studentRepo.update(students[0].id, { name: 'Updated Name' });
        assert(result !== undefined, 'update should return something');
      }
    });

    it('can remove a record', () => {
      const { repos } = createRepositories({ backendContext: context, forceInMemory: true });
      repos.studentRepo.insert({ id: 777, name: 'ToDelete' });
      repos.studentRepo.remove(777);
      const found = repos.studentRepo.getById(777);
      assert.equal(found, null);
    });
  });

  describe('All expected repos are present', () => {
    it('memory mode provides all required repos', () => {
      const { repos } = createRepositories({ backendContext: context, forceInMemory: true });
      const expectedKeys = [
        'studentRepo',
        'courseRepo',
        'enrollmentRepo',
        'scheduleSessionRepo',
        'scheduleAssignmentRepo',
        'attendanceRepo',
        'certificateRepo',
      ];
      for (const key of expectedKeys) {
        assert(repos[key], `should have ${key}`);
      }
    });
  });

  describe('isDatabaseConfigured export', () => {
    it('is a boolean', () => {
      assert(typeof isDatabaseConfigured === 'boolean', 'should be boolean');
    });
  });
});
