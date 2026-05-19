import { useCallback, useMemo } from 'react';
import { buildClassroomTopics } from '../../utils/domainRelations';
import { useClassroomGrades } from './useClassroomGrades';
import { useClassroomPosts } from './useClassroomPosts';
import { useClassroomRoster } from './useClassroomRoster';
import { useClassroomResults } from './useClassroomResults';
import { useClassroomSubmissions } from './useClassroomSubmissions';
import { useClassworkItems } from './useClassworkItems';
import { useCourses } from './useCourses';
import { useEnrollments } from './useEnrollments';
import { useModules } from './useModules';

const SYSTEM_ITEM_TYPES = new Set(['latihan', 'teori', 'praktik']);

function mapRosterEntry(entry) {
  return {
    id: entry.enrollment?.id || entry.student?.id || entry.key,
    key: entry.key,
    student: entry.student,
    account: entry.account,
    enrollment: entry.enrollment,
    access: entry.access,
    enrollmentStatus: entry.enrollmentStatus,
    paymentStatus: entry.paymentStatus,
    isMemberActive: entry.isActiveMember,
  };
}

function mapGradeRow(row) {
  const scoredColumns = [
    row.columns.assignment.score,
    row.columns.quiz.score,
    row.columns.latihan.score,
    row.columns.teori.score,
    row.columns.praktik.score,
  ].filter((score) => typeof score === 'number');

  return {
    enrollmentId: row.enrollment?.id || row.key,
    studentId: row.student?.id || null,
    studentName: row.student?.name || 'Siswa',
    paymentStatus: row.enrollment?.paymentStatus || 'pending',
    assignmentScore: row.columns.assignment.score,
    quizScore: row.columns.quiz.score,
    latihanScore: row.columns.latihan.score,
    teoriScore: row.columns.teori.score,
    praktikScore: row.columns.praktik.score,
    summaryScore: scoredColumns.length
      ? Math.round(scoredColumns.reduce((sum, score) => sum + score, 0) / scoredColumns.length)
      : null,
  };
}

export function useAdminClassroomData(courseId = null) {
  const coursesDomain = useCourses();
  const modulesDomain = useModules();
  const postsDomain = useClassroomPosts();
  const classworkDomain = useClassworkItems();
  const rosterDomain = useClassroomRoster();
  const gradesDomain = useClassroomGrades();
  const resultsDomain = useClassroomResults();
  const submissionsDomain = useClassroomSubmissions();
  const enrollmentsDomain = useEnrollments();
  const defaultCourseId = coursesDomain.courses[0]?.id ?? null;
  const activeCourseId = courseId ?? defaultCourseId;

  const moduleCountByCourse = useMemo(() => {
    const counts = new Map();

    modulesDomain.modules.forEach((module) => {
      if (module.isPublished === false || module.courseId == null) {
        return;
      }

      const courseKey = String(module.courseId);
      counts.set(courseKey, (counts.get(courseKey) || 0) + 1);
    });

    return counts;
  }, [modulesDomain.modules]);

  const postCountByCourse = useMemo(() => {
    const counts = new Map();

    postsDomain.classroomPosts.forEach((post) => {
      if (post.courseId == null) {
        return;
      }

      const courseKey = String(post.courseId);
      counts.set(courseKey, (counts.get(courseKey) || 0) + 1);
    });

    return counts;
  }, [postsDomain.classroomPosts]);

  const classrooms = useMemo(() => coursesDomain.courses.map((course) => {
    const courseIdValue = course.id;
    const isActiveCourse = String(courseIdValue) === String(activeCourseId);
    const allItems = classworkDomain.itemsByCourse[courseIdValue] || [];
    const systemItems = isActiveCourse
      ? allItems.filter((item) => SYSTEM_ITEM_TYPES.has(item.type))
      : [];
    const topicItems = isActiveCourse
      ? allItems.filter((item) => !SYSTEM_ITEM_TYPES.has(item.type))
      : [];
    const topicBundle = isActiveCourse
      ? buildClassroomTopics({
        courseId: courseIdValue,
        modules: modulesDomain.modules,
        items: topicItems,
      })
      : { topics: [], ungroupedItems: [] };
    const rosterBundle = rosterDomain.rosterByCourse[courseIdValue] || {
      roster: [],
      counts: {
        total: 0,
        active: 0,
        completed: 0,
        verified: 0,
        pending: 0,
        rejected: 0,
        activeMembers: 0,
      },
    };
    const gradebookSummary = gradesDomain.gradebooksByCourse[courseIdValue] || {
      rows: [],
      stats: {
        totalStudents: 0,
        pendingReviewCount: 0,
        fullyCompletedCount: 0,
      },
    };
    const posts = isActiveCourse
      ? postsDomain.classroomPosts
        .filter((post) => String(post.courseId) === String(courseIdValue))
        .sort((left, right) => new Date(right.publishedAt || right.updatedAt || 0) - new Date(left.publishedAt || left.updatedAt || 0))
      : [];

    return {
      key: courseIdValue,
      course,
      posts,
      topics: topicBundle.topics,
      ungroupedItems: topicBundle.ungroupedItems,
      genericItems: topicItems,
      systemItems,
      roster: rosterBundle.roster.map(mapRosterEntry),
      gradeRows: isActiveCourse ? gradebookSummary.rows.map(mapGradeRow) : [],
      counts: {
        activeStudents: rosterBundle.counts.activeMembers || 0,
        topics: moduleCountByCourse.get(String(courseIdValue)) || 0,
        classwork: allItems.length,
        pendingReview: gradebookSummary.stats.pendingReviewCount || 0,
        blockedByPayment: (rosterBundle.counts.pending || 0) + (rosterBundle.counts.rejected || 0),
      },
      stats: {
        postCount: postCountByCourse.get(String(courseIdValue)) || 0,
        pendingReviewCount: gradebookSummary.stats.pendingReviewCount || 0,
      },
    };
  }), [
    activeCourseId,
    classworkDomain.itemsByCourse,
    coursesDomain.courses,
    gradesDomain.gradebooksByCourse,
    modulesDomain.modules,
    moduleCountByCourse,
    postCountByCourse,
    postsDomain.classroomPosts,
    rosterDomain.rosterByCourse,
  ]);

  const selectedClassroom = useMemo(() => {
    if (courseId == null) {
      return classrooms[0] || null;
    }

    return classrooms.find((classroom) => String(classroom.key) === String(courseId)) || classrooms[0] || null;
  }, [classrooms, courseId]);

  const getClassroomByCourseId = useCallback((nextCourseId) => (
    classrooms.find((classroom) => String(classroom.key) === String(nextCourseId)) || null
  ), [classrooms]);

  return useMemo(() => ({
    classrooms,
    defaultCourseId,
    selectedClassroom,
    getClassroomByCourseId,
    setClassroomPosts: postsDomain.setClassroomPosts,
    createPost: postsDomain.createPost,
    updatePost: postsDomain.updatePost,
    removePost: postsDomain.removePost,
    setClassworkItems: classworkDomain.setClassworkItems,
    createClassworkItem: classworkDomain.createClassworkItem,
    updateClassworkItem: classworkDomain.updateClassworkItem,
    removeClassworkItem: classworkDomain.removeClassworkItem,
    setClassworkResults: resultsDomain.setClassworkResults,
    setClassworkSubmissions: submissionsDomain.setClassworkSubmissions,
    setEnrollments: enrollmentsDomain.setEnrollments,
    addMember: rosterDomain.addMember,
    removeMember: rosterDomain.removeMember,
    isReady: [
      coursesDomain.isReady,
      modulesDomain.isReady,
      postsDomain.isReady,
      classworkDomain.isReady,
      rosterDomain.isReady,
      gradesDomain.isReady,
      resultsDomain.isReady,
      submissionsDomain.isReady,
      enrollmentsDomain.isReady,
    ].every(Boolean),
    error: [
      coursesDomain.error,
      modulesDomain.error,
      postsDomain.error,
      classworkDomain.error,
      rosterDomain.error,
      gradesDomain.error,
      resultsDomain.error,
      submissionsDomain.error,
      enrollmentsDomain.error,
    ].find(Boolean) || '',
    reload: () => {
      coursesDomain.reload();
      modulesDomain.reload();
      postsDomain.reload();
      classworkDomain.reload();
      rosterDomain.reload();
      gradesDomain.reload();
      resultsDomain.reload();
      submissionsDomain.reload();
      enrollmentsDomain.reload();
    },
  }), [
    classrooms,
    classworkDomain,
    coursesDomain,
    defaultCourseId,
    enrollmentsDomain,
    getClassroomByCourseId,
    gradesDomain,
    modulesDomain,
    postsDomain,
    resultsDomain,
    rosterDomain,
    selectedClassroom,
    submissionsDomain,
  ]);
}
