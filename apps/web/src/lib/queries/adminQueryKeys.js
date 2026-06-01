import { normalizeQueryKeyFilters } from '../../services/admin/routeClient';

export const adminQueryKeys = {
  all: ['admin'],
  dashboard: () => [...adminQueryKeys.all, 'dashboard'],
  learningOps: () => [...adminQueryKeys.all, 'learning-ops'],
  classroomsRoot: () => [...adminQueryKeys.all, 'classrooms'],
  classroom: (courseId) => [...adminQueryKeys.classroomsRoot(), String(courseId)],
  schedule: (courseId) => [...adminQueryKeys.classroom(courseId), 'schedule'],
  scheduleSession: (courseId, sessionId) => [...adminQueryKeys.schedule(courseId), String(sessionId)],
  scheduleAttendance: (courseId, sessionId) => [...adminQueryKeys.scheduleSession(courseId, sessionId), 'attendance'],
  studentsRoot: () => [...adminQueryKeys.all, 'students'],
  students: (filters = {}) => [...adminQueryKeys.studentsRoot(), normalizeQueryKeyFilters(filters)],
  student: (studentId) => [...adminQueryKeys.studentsRoot(), String(studentId)],
};
