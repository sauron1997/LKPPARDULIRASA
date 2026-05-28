import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  normalizeAssessmentDefinition,
  normalizeAssessmentType,
} from '../../../../src/utils/domainRelations.js';
import { isDatabaseConfigured, requireDb } from '../../db/client.js';
import {
  assessmentDefinitions,
  assessmentQuestions,
} from '../../db/schema/index.js';

function toBoolean(value) {
  return value === true || value === 'true';
}

function toDateString(value) {
  if (!value) {
    return '';
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function normalizeExtensions(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  return String(value || '')
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeQuestionPayload(definitionId, questions = []) {
  return (Array.isArray(questions) ? questions : [])
    .map((question, index) => {
      const prompt = String(question?.prompt || '').trim();
      if (!prompt) {
        return null;
      }

      return {
        id: question?.id || `${definitionId}-question-${index + 1}`,
        definitionId,
        order: Number(question?.order || index + 1),
        kind: question?.kind === 'multiple_choice' ? 'multiple_choice' : 'essay',
        prompt,
        options: Array.isArray(question?.options) ? question.options : [],
        answer: question?.answer ?? null,
        weight: Number(question?.weight) > 0 ? Number(question.weight) : 1,
      };
    })
    .filter(Boolean);
}

function mapDefinitionRows(definitionRows = [], questionRows = []) {
  const questionsByDefinition = questionRows.reduce((accumulator, row) => {
    const key = String(row.definitionId);
    const bucket = accumulator.get(key) || [];
    bucket.push({
      id: row.id,
      order: Number(row.order || 0),
      prompt: row.prompt || '',
      kind: row.kind || 'essay',
      options: Array.isArray(row.options) ? row.options : [],
      answer: row.answer ?? null,
      weight: Number(row.weight || 1),
    });
    accumulator.set(key, bucket);
    return accumulator;
  }, new Map());

  return definitionRows.map((row) => normalizeAssessmentDefinition({
    id: row.id,
    courseId: Number(row.courseId),
    type: normalizeAssessmentType(row.type),
    title: row.title || '',
    summary: row.summary || '',
    description: row.summary || '',
    instructions: row.instructions || '',
    durationMinutes: Number(row.durationMinutes || 60),
    passingScore: Number(row.passingScore || 75),
    maxScore: Number(row.maxScore || 100),
    maxAttempts: Number(row.maxAttempts || 1),
    allowRetry: toBoolean(row.allowRetry),
    submissionMode: row.submissionMode || 'online_quiz',
    allowedExtensions: Array.isArray(row.allowedExtensions) ? row.allowedExtensions : [],
    isPublished: toBoolean(row.isPublished),
    questions: (questionsByDefinition.get(String(row.id)) || [])
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
      .map((question) => ({
        id: question.id,
        prompt: question.prompt,
        kind: question.kind,
        options: question.options,
        answer: question.answer,
        weight: question.weight,
      })),
    createdAt: toDateString(row.createdAt),
    updatedAt: toDateString(row.updatedAt),
  }));
}

async function loadQuestionsForDefinitions(database, definitionRows = []) {
  const definitionIds = definitionRows.map((row) => row.id).filter(Boolean);
  if (definitionIds.length === 0) {
    return [];
  }

  return database.select()
    .from(assessmentQuestions)
    .where(inArray(assessmentQuestions.definitionId, definitionIds))
    .orderBy(asc(assessmentQuestions.order));
}

async function loadMappedDefinitionSet(database, filters = {}) {
  const conditions = [];

  if (filters.definitionId) {
    conditions.push(eq(assessmentDefinitions.id, String(filters.definitionId)));
  }
  if (filters.courseId != null && filters.courseId !== '') {
    conditions.push(eq(assessmentDefinitions.courseId, Number(filters.courseId)));
  }
  if (filters.type) {
    conditions.push(eq(assessmentDefinitions.type, normalizeAssessmentType(filters.type)));
  }

  const query = database.select().from(assessmentDefinitions).orderBy(asc(assessmentDefinitions.createdAt));
  const definitionRows = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;
  const questionRows = await loadQuestionsForDefinitions(database, definitionRows);
  return mapDefinitionRows(definitionRows, questionRows);
}

function buildDefinitionRecord(payload = {}, now) {
  return {
    id: payload.id,
    courseId: Number(payload.courseId),
    type: normalizeAssessmentType(payload.type),
    title: payload.title || payload.type || '',
    summary: payload.summary ?? payload.description ?? '',
    instructions: payload.instructions || '',
    durationMinutes: Number(payload.durationMinutes || 60),
    passingScore: Number(payload.passingScore || 75),
    maxScore: Number(payload.maxScore || 100),
    maxAttempts: Number(payload.maxAttempts || 1),
    allowRetry: String(payload.allowRetry ?? true),
    submissionMode: payload.submissionMode || 'online_quiz',
    allowedExtensions: normalizeExtensions(payload.allowedExtensions),
    isPublished: String(payload.isPublished ?? true),
    createdAt: now,
    updatedAt: now,
  };
}

async function replaceDefinitionQuestions(database, definitionId, questions = []) {
  await database.delete(assessmentQuestions).where(eq(assessmentQuestions.definitionId, String(definitionId)));

  const nextQuestions = normalizeQuestionPayload(String(definitionId), questions);
  if (nextQuestions.length > 0) {
    await database.insert(assessmentQuestions).values(nextQuestions);
  }
}

export function canUseDatabaseAssessmentDefinitions() {
  return isDatabaseConfigured;
}

export async function listPersistedAssessmentDefinitions(filters = {}) {
  const database = requireDb();
  return loadMappedDefinitionSet(database, filters);
}

export async function getPersistedAssessmentDefinition(definitionId) {
  const database = requireDb();
  const [definition] = await loadMappedDefinitionSet(database, { definitionId });
  return definition || null;
}

export async function createPersistedAssessmentDefinition(payload = {}) {
  const database = requireDb();
  const normalizedType = normalizeAssessmentType(payload.type);
  const existingById = payload.id
    ? await getPersistedAssessmentDefinition(payload.id)
    : null;
  const existingByCourseType = !existingById && payload.courseId && normalizedType
    ? (await loadMappedDefinitionSet(database, {
      courseId: payload.courseId,
      type: normalizedType,
    }))[0] || null
    : null;

  if (existingById || existingByCourseType) {
    return updatePersistedAssessmentDefinition(
      existingById?.id || existingByCourseType?.id,
      payload,
    );
  }

  const now = new Date();
  const record = buildDefinitionRecord({
    ...payload,
    id: payload.id || `definition-${payload.courseId}-${normalizedType}`,
    type: normalizedType,
  }, now);

  await database.transaction(async (transaction) => {
    await transaction.insert(assessmentDefinitions).values(record);
    await replaceDefinitionQuestions(transaction, record.id, payload.questions);
  });

  return getPersistedAssessmentDefinition(record.id);
}

export async function updatePersistedAssessmentDefinition(definitionId, payload = {}) {
  const database = requireDb();
  const [currentRow] = await database.select()
    .from(assessmentDefinitions)
    .where(eq(assessmentDefinitions.id, String(definitionId)))
    .limit(1);

  if (!currentRow) {
    return null;
  }

  const now = new Date();
  const nextType = payload.type ? normalizeAssessmentType(payload.type) : currentRow.type;
  const nextDefinition = {
    id: currentRow.id,
    courseId: payload.courseId != null ? Number(payload.courseId) : Number(currentRow.courseId),
    type: nextType,
    title: payload.title ?? currentRow.title,
    summary: payload.summary ?? payload.description ?? currentRow.summary ?? '',
    instructions: payload.instructions ?? currentRow.instructions ?? '',
    durationMinutes: payload.durationMinutes != null ? Number(payload.durationMinutes) : Number(currentRow.durationMinutes || 60),
    passingScore: payload.passingScore != null ? Number(payload.passingScore) : Number(currentRow.passingScore || 75),
    maxScore: payload.maxScore != null ? Number(payload.maxScore) : Number(currentRow.maxScore || 100),
    maxAttempts: payload.maxAttempts != null ? Number(payload.maxAttempts) : Number(currentRow.maxAttempts || 1),
    allowRetry: String(payload.allowRetry ?? toBoolean(currentRow.allowRetry)),
    submissionMode: payload.submissionMode ?? currentRow.submissionMode ?? 'online_quiz',
    allowedExtensions: Array.isArray(payload.allowedExtensions)
      ? normalizeExtensions(payload.allowedExtensions)
      : (Array.isArray(currentRow.allowedExtensions) ? currentRow.allowedExtensions : []),
    isPublished: String(payload.isPublished ?? toBoolean(currentRow.isPublished)),
    updatedAt: now,
  };

  await database.transaction(async (transaction) => {
    await transaction.update(assessmentDefinitions)
      .set(nextDefinition)
      .where(eq(assessmentDefinitions.id, String(definitionId)));

    if (Array.isArray(payload.questions)) {
      await replaceDefinitionQuestions(transaction, definitionId, payload.questions);
    }
  });

  return getPersistedAssessmentDefinition(definitionId);
}
