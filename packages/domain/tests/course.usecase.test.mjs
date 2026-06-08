import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createCourseUseCases } from '../src/use-cases/course.usecase.js';
import { buildFakeDeps, createFakeCourseRepo } from './helpers/fake-repos.mjs';

describe('course.usecase.js', () => {
  let deps;
  let useCases;
  let seed;

  beforeEach(() => {
    deps = buildFakeDeps();
    // course.usecase needs additional repos for getPublicOverview
    deps.blogRepo = { list() { return []; } };
    deps.galleryRepo = { list() { return []; } };
    deps.accreditationRepo = { list() { return []; } };
    deps.paymentSettingsRepo = { get() { return {}; } };
    seed = deps._seed;
    useCases = createCourseUseCases(deps);
  });

  describe('listCourses()', () => {
    it('returns all courses', async () => {
      const result = await useCases.listCourses();
      assert(Array.isArray(result));
      assert(result.length >= 1);
    });
  });

  describe('getCourse()', () => {
    it('returns course by id', async () => {
      const result = await useCases.getCourse(seed.course.id);
      assert(result);
      assert.equal(result.id, seed.course.id);
    });

    it('throws 404 for non-existent course', async () => {
      await assert.rejects(
        () => useCases.getCourse('nonexistent'),
        (err) => err.status === 404 || err.code?.includes('NOT_FOUND'),
      );
    });
  });

  describe('createCourse()', () => {
    it('creates a new course with title', async () => {
      const course = await useCases.createCourse({ title: 'Kursus Baru', price: '750000' });
      assert(course.id, 'should have id');
      assert.equal(course.title, 'Kursus Baru');
    });

    it('creates course even without title (use case may allow it)', async () => {
      // Some use cases set a default title; just verify no crash
      const course = await useCases.createCourse({ price: '500000' });
      assert(course, 'should return a course object');
    });
  });

  describe('updateCourse()', () => {
    it('updates course title', async () => {
      const updated = await useCases.updateCourse(seed.course.id, { title: 'Updated Title' });
      assert(updated);
      const found = await deps.courseRepo.getById(seed.course.id);
      assert.equal(found.title, 'Updated Title');
    });
  });

  describe('getPublicOverview()', () => {
    it('returns overview with courses array', async () => {
      const result = await useCases.getPublicOverview();
      assert(result, 'should return overview');
      assert(Array.isArray(result.courses), 'should have courses array');
    });
  });
});
