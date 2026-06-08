import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { getStudentPortal } from '../../src/modules/student/student-portal.js';
import { buildStudentFixture } from '../helpers/test-context.mjs';

describe('student/student-portal.js', () => {
  let fixture;

  beforeEach(() => {
    fixture = buildStudentFixture();
  });

  describe('getStudentPortal()', () => {
    it('resolves student by studentId', async () => {
      const portal = await getStudentPortal(
        { studentId: fixture.student.id },
        { context: fixture.context },
      );
      assert(portal.student, 'should have student');
      assert.equal(portal.student.id, fixture.student.id);
    });

    it('resolves student by email', async () => {
      const portal = await getStudentPortal(
        { email: fixture.student.email },
        { context: fixture.context },
      );
      assert(portal.student);
      assert.equal(portal.student.email, fixture.student.email);
    });

    it('resolves student by nis', async () => {
      const portal = await getStudentPortal(
        { nis: fixture.student.nis },
        { context: fixture.context },
      );
      assert(portal.student);
      assert.equal(portal.student.nis, fixture.student.nis);
    });

    it('includes enrollment and course when available', async () => {
      const portal = await getStudentPortal(
        { studentId: fixture.student.id },
        { context: fixture.context },
      );
      assert(portal.enrollment, 'should have enrollment');
      assert(portal.course, 'should have course');
      assert.equal(portal.enrollment.id, fixture.enrollment.id);
      assert.equal(portal.course.id, fixture.course.id);
    });

    it('sanitizes account password', async () => {
      const portal = await getStudentPortal(
        { studentId: fixture.student.id },
        { context: fixture.context },
      );
      assert(portal.account, 'should have account');
      assert.equal(portal.account.password, undefined, 'password must be removed');
    });

    it('returns null student when not found', async () => {
      const portal = await getStudentPortal(
        { studentId: 99999 },
        { context: fixture.context },
      );
      assert.equal(portal.student, null);
    });

    it('resolves via user object reference', async () => {
      const portal = await getStudentPortal(
        { user: { studentId: fixture.student.id } },
        { context: fixture.context },
      );
      assert(portal.student);
      assert.equal(portal.student.id, fixture.student.id);
    });
  });
});
