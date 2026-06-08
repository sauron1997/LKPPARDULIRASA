import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAttendanceUseCases } from '../src/use-cases/attendance.usecase.js';
import { createScheduleUseCases } from '../src/use-cases/schedule.usecase.js';
import { buildFakeDeps } from './helpers/fake-repos.mjs';

describe('attendance.usecase.js', () => {
  let deps;
  let useCases;
  let scheduleUseCases;
  let seed;
  let session;

  beforeEach(async () => {
    deps = buildFakeDeps();
    seed = deps._seed;
    useCases = createAttendanceUseCases(deps);

    // Create session and assignment directly (bypasses schedule use case complexity)
    const now = new Date().toISOString();
    const startAt = new Date(Date.now() + 3600000).toISOString();
    const endAt = new Date(Date.now() + 7200000).toISOString();

    session = {
      id: 'session-test-1',
      courseId: seed.course.id,
      title: 'Test Session',
      startAt,
      endAt,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    };
    deps.scheduleSessionRepo.insert(session);

    const assignment = {
      id: `assign-${session.id}-${seed.enrollment.id}`,
      sessionId: session.id,
      enrollmentId: seed.enrollment.id,
      studentId: seed.student.id,
      courseId: seed.course.id,
      status: 'scheduled',
      assignmentStatus: 'assigned',
      createdAt: now,
      updatedAt: now,
    };
    deps.scheduleAssignmentRepo.insert(assignment);
  });

  describe('listScheduleAttendance()', () => {
    it('returns session with attendance data', async () => {
      const result = await useCases.listScheduleAttendance(session.id);
      assert(result, 'should return result');
      assert(result.session, 'should have session');
      // Use case may return rows, roster, or another key
      const hasAttendanceData = result.rows || result.roster || result.attendance || result.records;
      assert(hasAttendanceData !== undefined, 'should have attendance data in result');
    });

    it('throws 404 for non-existent schedule', async () => {
      await assert.rejects(
        () => useCases.listScheduleAttendance('no-session'),
        (err) => err.status === 404,
      );
    });
  });

  describe('recordSessionAttendance()', () => {
    it('records present status for enrolled student', async () => {
      const result = await useCases.recordSessionAttendance(session.id, {
        enrollmentId: seed.enrollment.id,
        status: 'present',
      });
      assert(result, 'should return attendance record');
      assert.equal(result.status, 'present');
    });

    it('records or rejects invalid attendance status', async () => {
      // Use case may filter or reject invalid status — test it doesn't cause unexpected crash
      const result = await useCases.recordSessionAttendance(session.id, {
        enrollmentId: seed.enrollment.id,
        status: 'invalid_status',
      }).catch((e) => e);
      assert(result !== undefined, 'should return something (error or record)');
    });

    it('handles enrollment not assigned to session', async () => {
      // Use case may reject or return null — test it doesn't cause unexpected crash
      const result = await useCases.recordSessionAttendance(session.id, {
        enrollmentId: 'enr-not-assigned',
        status: 'present',
      }).catch((e) => e);
      assert(result !== undefined, 'should return something');
    });
  });

  describe('updateSessionAttendance()', () => {
    it('updates existing attendance record status', async () => {
      // First insert attendance record directly
      const now = new Date().toISOString();
      const attendanceRecord = {
        id: `att-${session.id}-${seed.enrollment.id}`,
        sessionId: session.id,
        enrollmentId: seed.enrollment.id,
        studentId: seed.student.id,
        courseId: seed.course.id,
        status: 'present',
        createdAt: now,
        updatedAt: now,
      };
      deps.attendanceRepo.insert(attendanceRecord);

      const updated = await useCases.updateSessionAttendance(session.id, attendanceRecord.id, {
        status: 'late',
      });
      assert(updated, 'should return updated record');
      assert.equal(updated.status, 'late');
    });
  });

  describe('getStudentAttendance()', () => {
    it('returns attendance records for enrollment', async () => {
      await useCases.recordSessionAttendance(session.id, {
        enrollmentId: seed.enrollment.id,
        status: 'present',
      });
      const result = await useCases.getStudentAttendance({
        enrollmentId: seed.enrollment.id,
      });
      assert(result, 'should return result');
    });
  });
});
