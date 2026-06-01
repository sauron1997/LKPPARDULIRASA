import { useMemo } from 'react';
import { buildClassroomGradebook } from '@lkp-parduli-rasa/domain';
import { useAssessmentProgress } from './useAssessmentProgress';
import { useAssessmentSubmissions } from './useAssessmentSubmissions';
import { useClassroomResults } from './useClassroomResults';
import { useClassroomRoster } from './useClassroomRoster';
import { useClassroomSubmissions } from './useClassroomSubmissions';
import { useClassworkItems } from './useClassworkItems';
import { useCourses } from './useCourses';

export function useClassroomGrades(courseId = null) {
  const coursesDomain = useCourses();
  const classworkDomain = useClassworkItems();
  const rosterDomain = useClassroomRoster();
  const resultsDomain = useClassroomResults();
  const submissionsDomain = useClassroomSubmissions();
  const assessmentProgressDomain = useAssessmentProgress();
  const assessmentSubmissionsDomain = useAssessmentSubmissions();

  const gradebooksByCourse = useMemo(() => coursesDomain.courses.reduce((accumulator, course) => ({
    ...accumulator,
    [course.id]: buildClassroomGradebook({
      courseId: course.id,
      roster: rosterDomain.rosterByCourse[course.id]?.roster || [],
      classworkItems: classworkDomain.itemsByCourse[course.id] || [],
      classworkResults: resultsDomain.classworkResults,
      classworkSubmissions: submissionsDomain.classworkSubmissions,
      assessmentProgress: assessmentProgressDomain.assessmentProgress,
      assessmentSubmissions: assessmentSubmissionsDomain.assessmentSubmissions,
    }),
  }), {}), [
    assessmentProgressDomain.assessmentProgress,
    assessmentSubmissionsDomain.assessmentSubmissions,
    classworkDomain.itemsByCourse,
    coursesDomain.courses,
    resultsDomain.classworkResults,
    rosterDomain.rosterByCourse,
    submissionsDomain.classworkSubmissions,
  ]);

  const selectedGradebook = courseId == null
    ? null
    : gradebooksByCourse[courseId] || buildClassroomGradebook({
      courseId,
      roster: rosterDomain.rosterByCourse[courseId]?.roster || [],
      classworkItems: classworkDomain.itemsByCourse[courseId] || [],
      classworkResults: resultsDomain.classworkResults,
      classworkSubmissions: submissionsDomain.classworkSubmissions,
      assessmentProgress: assessmentProgressDomain.assessmentProgress,
      assessmentSubmissions: assessmentSubmissionsDomain.assessmentSubmissions,
    });

  return useMemo(() => ({
    gradebook: selectedGradebook,
    rows: selectedGradebook?.rows || [],
    columns: selectedGradebook?.columns || [],
    stats: selectedGradebook?.stats || {
      totalStudents: 0,
      pendingReviewCount: 0,
      fullyCompletedCount: 0,
    },
    gradebooksByCourse,
    setClassworkResults: resultsDomain.setClassworkResults,
    setClassworkSubmissions: submissionsDomain.setClassworkSubmissions,
    setAssessmentProgress: assessmentProgressDomain.setAssessmentProgress,
    setAssessmentSubmissions: assessmentSubmissionsDomain.setAssessmentSubmissions,
    isReady: [
      coursesDomain.isReady,
      classworkDomain.isReady,
      rosterDomain.isReady,
      resultsDomain.isReady,
      submissionsDomain.isReady,
      assessmentProgressDomain.isReady,
      assessmentSubmissionsDomain.isReady,
    ].every(Boolean),
    error: [
      coursesDomain.error,
      classworkDomain.error,
      rosterDomain.error,
      resultsDomain.error,
      submissionsDomain.error,
      assessmentProgressDomain.error,
      assessmentSubmissionsDomain.error,
    ].find(Boolean) || '',
    reload: () => {
      coursesDomain.reload();
      classworkDomain.reload();
      rosterDomain.reload();
      resultsDomain.reload();
      submissionsDomain.reload();
      assessmentProgressDomain.reload();
      assessmentSubmissionsDomain.reload();
    },
  }), [
    assessmentProgressDomain,
    assessmentSubmissionsDomain,
    classworkDomain,
    coursesDomain,
    gradebooksByCourse,
    resultsDomain,
    rosterDomain,
    selectedGradebook,
    submissionsDomain,
  ]);
}
