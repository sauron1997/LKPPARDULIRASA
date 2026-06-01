import { useMemo } from 'react';
import {
  buildClassroomTopics,
  normalizeClassworkItem,
} from '@lkp-parduli-rasa/domain';
import { useAssessmentDefinitions } from './useAssessmentDefinitions';
import { useAdminClassworkItemsQuery, useCreateAdminClassworkItemMutation } from './useClassroomOverlayQueries';
import { useCourses } from './useCourses';
import { useModules } from './useModules';

function buildMaterialItems(modules = []) {
  return modules
    .filter((module) => module.isPublished !== false)
    .map((module) => normalizeClassworkItem({
      id: `material-${module.id}`,
      courseId: module.courseId,
      topicId: module.id,
      moduleId: module.id,
      type: 'material',
      title: `Materi: ${module.title}`,
      summary: module.summary || '',
      description: module.summary || '',
      source: 'module',
      resourceType: module.resourceType || 'lesson',
      orderIndex: Number(module.order || 0),
      isPublished: module.isPublished ?? true,
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    }));
}

function buildSystemItems(assessmentDefinitions = []) {
  return assessmentDefinitions
    .filter((definition) => definition.isPublished !== false)
    .map((definition, index) => normalizeClassworkItem({
      id: `system-${definition.id}`,
      definitionId: definition.id,
      courseId: definition.courseId,
      topicId: Array.isArray(definition.moduleIds) && definition.moduleIds.length ? definition.moduleIds[0] : null,
      moduleIds: Array.isArray(definition.moduleIds) ? definition.moduleIds : [],
      type: definition.type,
      title: definition.title,
      summary: definition.description || '',
      description: definition.description || '',
      instructions: definition.instructions,
      maxScore: definition.maxScore || 100,
      passingScore: definition.passingScore || 75,
      maxAttempts: definition.maxAttempts,
      source: 'assessment',
      submissionMode: 'assessment',
      orderIndex: 1000 + index,
      isPublished: definition.isPublished ?? true,
      questions: definition.questions || [],
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    }));
}

export function useClassworkItems(courseId = null) {
  const query = useAdminClassworkItemsQuery();
  const createMutation = useCreateAdminClassworkItemMutation();
  const coursesDomain = useCourses();
  const modulesDomain = useModules();
  const definitionsDomain = useAssessmentDefinitions();

  const genericClassworkItems = useMemo(() => (Array.isArray(query.data) ? query.data : [])
    .map((item, index) => normalizeClassworkItem(item, index))
    .sort((left, right) => {
      if (String(left.courseId) !== String(right.courseId)) {
        return Number(left.courseId || 0) - Number(right.courseId || 0);
      }

      return Number(left.orderIndex || 0) - Number(right.orderIndex || 0);
    }), [query.data]);

  const materialItems = useMemo(() => buildMaterialItems(modulesDomain.modules), [modulesDomain.modules]);
  const systemClassworkItems = useMemo(() => buildSystemItems(definitionsDomain.assessmentDefinitions), [definitionsDomain.assessmentDefinitions]);
  const combinedItems = useMemo(() => [
    ...genericClassworkItems,
    ...materialItems,
    ...systemClassworkItems,
  ], [genericClassworkItems, materialItems, systemClassworkItems]);

  const classworkItems = useMemo(() => (
    courseId == null
      ? combinedItems
      : combinedItems.filter((item) => String(item.courseId) === String(courseId))
  ), [combinedItems, courseId]);

  const topicsBundle = useMemo(() => (
    courseId == null
      ? null
      : buildClassroomTopics({
        courseId,
        modules: modulesDomain.modules,
        items: classworkItems,
      })
  ), [classworkItems, courseId, modulesDomain.modules]);

  const itemsByCourse = useMemo(() => {
    const grouped = Object.fromEntries(coursesDomain.courses.map((course) => [course.id, []]));

    combinedItems.forEach((item) => {
      if (item.courseId == null) {
        return;
      }

      if (!grouped[item.courseId]) {
        grouped[item.courseId] = [];
      }

      grouped[item.courseId].push(item);
    });

    return grouped;
  }, [combinedItems, coursesDomain.courses]);

  return {
    classworkItems,
    genericClassworkItems,
    materialItems,
    systemClassworkItems,
    itemsByCourse,
    topics: topicsBundle?.topics || [],
    ungroupedItems: topicsBundle?.ungroupedItems || [],
    createClassworkItem: (payload) => createMutation.mutateAsync(payload),
    isReady: [
      !query.isPending,
      coursesDomain.isReady,
      modulesDomain.isReady,
      definitionsDomain.isReady,
    ].every(Boolean),
    error: [
      query.error?.message || createMutation.error?.message,
      coursesDomain.error,
      modulesDomain.error,
      definitionsDomain.error,
    ].find(Boolean) || '',
    reload: () => {
      query.refetch();
      coursesDomain.reload();
      modulesDomain.reload();
      definitionsDomain.reload();
    },
  };
}
