import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createStudentScheduleService } from '../../src/modules/student/student-schedule.service.js';
import { buildStudentFixture, buildScheduleFixture } from '../helpers/test-context.mjs';

describe('student/student-schedule.service.js', () => {
  let fixture;
  let svc;

  beforeEach(() => {
    fixture = buildStudentFixture();
    svc = createStudentScheduleService({ state: fixture.context.state });
  });

  const reference = () => ({ studentId: fixture.student.id });

  describe('getStudentSchedules()', () => {
    it('returns schedules and summary for enrolled student', async () => {
      buildScheduleFixture(fixture.context, fixture.enrollment);
      const result = await svc.getStudentSchedules(reference());
      assert(Array.isArray(result.schedules), 'should have schedules array');
      assert(result.summary, 'should have summary');
      assert.equal(result.schedules.length, 1);
    });

    it('returns empty schedules for student with no assignments', async () => {
      const result = await svc.getStudentSchedules(reference());
      assert.equal(result.schedules.length, 0);
    });

    it('excludes cancelled sessions', async () => {
      buildScheduleFixture(fixture.context, fixture.enrollment, { status: 'cancelled' });
      const result = await svc.getStudentSchedules(reference());
      assert.equal(result.schedules.length, 0, 'cancelled sessions should be excluded');
    });

    it('throws 403 if classroom access denied', async () => {
      // Set enrollment to unverified payment so access is denied
      fixture.context.repositories.enrollments.update(fixture.enrollment.id, (e) => ({
        ...e, paymentStatus: 'pending',
      }));
      await assert.rejects(
        () => svc.getStudentSchedules(reference()),
        (err) => err.status === 403,
      );
    });
  });

  describe('getStudentAttendance()', () => {
    it('returns attendance records for enrolled student', async () => {
      buildScheduleFixture(fixture.context, fixture.enrollment);
      const result = await svc.getStudentAttendance(reference());
      assert(Array.isArray(result.attendance), 'should have attendance array');
      assert(result.summary, 'should have summary');
    });
  });

  describe('checkInStudentSchedule()', () => {
    it('creates attendance record for valid session', async () => {
      const { session } = buildScheduleFixture(fixture.context, fixture.enrollment);
      const result = await svc.checkInStudentSchedule(reference(), session.id, {});
      assert(result.attendance, 'should return attendance record');
      assert(['present', 'late'].includes(result.attendance.status));
    });

    it('throws 409 if already checked in', async () => {
      const { session } = buildScheduleFixture(fixture.context, fixture.enrollment);
      await svc.checkInStudentSchedule(reference(), session.id, {});
      await assert.rejects(
        () => svc.checkInStudentSchedule(reference(), session.id, {}),
        (err) => err.status === 409,
      );
    });

    it('throws 404 for unknown session', async () => {
      await assert.rejects(
        () => svc.checkInStudentSchedule(reference(), 'no-such-session', {}),
        (err) => err.status === 403 || err.status === 404,
      );
    });
  });
});
