import { useCallback, useMemo } from 'react';
import { getDefaultClassworkItems } from '../../services/admin/defaults';
import {
  CLASSWORK_ITEM_STORAGE_KEY,
  buildClassroomTopics,
  normalizeClassworkItem,
} from '../../utils/domainRelations';
import { useAssessmentDefinitions } from './useAssessmentDefinitions';
import { useCourses } from './useCourses';
import { useModules } from './useModules';
import { useStoredDomain } from './useStoredDomain';

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
  const domain = useStoredDomain(CLASSWORK_ITEM_STORAGE_KEY, getDefaultClassworkItems);
  const coursesDomain = useCourses();
  const modulesDomain = useModules();
  const definitionsDomain = useAssessmentDefinitions();

  const genericClassworkItems = useMemo(() => domain.data
    .map((item, index) => normalizeClassworkItem(item, index))
    .sort((left, right) => {
      if (String(left.courseId) !== String(right.courseId)) {
        return Number(left.courseId || 0) - Number(right.courseId || 0);
      }

      return Number(left.orderIndex || 0) - Number(right.orderIndex || 0);
    }), [domain.data]);

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

  const createClassworkItem = useCallback((payload) => {
    const nextItem = normalizeClassworkItem({
      ...payload,
      id: payload?.id || `cwi-${payload?.courseId || 'course'}-${Date.now()}`,
      source: 'classroom',
      createdAt: payload?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    domain.setData((currentItems = []) => [nextItem, ...currentItems]);
    return nextItem;
  }, [domain]);

  const updateClassworkItem = useCallback((itemId, updater) => {
    let updatedItem = null;

    domain.setData((currentItems = []) => currentItems.map((item, index) => {
      if (String(item.id) !== String(itemId)) {
        return item;
      }

      const nextValue = typeof updater === 'function' ? updater(item) : { ...item, ...updater };
      updatedItem = normalizeClassworkItem({
        ...item,
        ...nextValue,
        source: 'classroom',
        updatedAt: new Date().toISOString(),
      }, index);
      return updatedItem;
    }));

    return updatedItem;
  }, [domain]);

  const removeClassworkItem = useCallback((itemId) => {
    domain.setData((currentItems = []) => currentItems.filter((item) => String(item.id) !== String(itemId)));
  }, [domain]);

  return useMemo(() => ({
    classworkItems,
    genericClassworkItems,
    materialItems,
    systemClassworkItems,
    itemsByCourse,
    topics: topicsBundle?.topics || [],
    ungroupedItems: topicsBundle?.ungroupedItems || [],
    setClassworkItems: domain.setData,
    createClassworkItem,
    updateClassworkItem,
    removeClassworkItem,
    isReady: [
      domain.isReady,
      coursesDomain.isReady,
      modulesDomain.isReady,
      definitionsDomain.isReady,
    ].every(Boolean),
    error: [
      domain.error,
      coursesDomain.error,
      modulesDomain.error,
      definitionsDomain.error,
    ].find(Boolean) || '',
    reload: () => {
      domain.reload();
      coursesDomain.reload();
      modulesDomain.reload();
      definitionsDomain.reload();
    },
  }), [
    classworkItems,
    createClassworkItem,
    coursesDomain,
    definitionsDomain,
    domain,
    genericClassworkItems,
    itemsByCourse,
    materialItems,
    modulesDomain,
    removeClassworkItem,
    systemClassworkItems,
    topicsBundle,
    updateClassworkItem,
  ]);
}
