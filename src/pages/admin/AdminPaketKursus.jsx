import { memo, useCallback, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BookCopy, ClipboardCheck, Edit3, Package, Plus, Save, Trash2 } from 'lucide-react';
import {
  AdminConfirmDialog,
  AdminHero,
  AdminNotice,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminSurface,
  AdminTag,
  AdminToast,
} from '../../components/admin/AdminUi';
import { useAssessmentDefinitions } from '../../hooks/admin/useAssessmentDefinitions';
import { useCourses } from '../../hooks/admin/useCourses';
import { useEnrollments } from '../../hooks/admin/useEnrollments';
import { useModules } from '../../hooks/admin/useModules';
import { useStudents } from '../../hooks/admin/useStudents';
import { formatCoursePrice } from '../../services/admin/defaults';
import { buildModuleDownloadFallback } from '../../utils/domainRelations';

const ASSESSMENT_EDITOR_CONFIG = [
  {
    key: 'latihan',
    label: 'Latihan Teori',
    description: 'Checkpoint ringan untuk mengukur pemahaman sebelum ujian teori utama dibuka.',
    durationMinutes: 30,
    passingScore: 75,
    defaultQuestionKind: 'multiple_choice',
    questionLabel: 'Soal latihan',
    emptyPrompt: 'Tulis soal latihan atau arahan pengerjaan singkat.',
    submissionMode: 'online_quiz',
    maxAttempts: 3,
    allowRetry: true,
    allowedExtensions: [],
  },
  {
    key: 'teori',
    label: 'Ujian Teori',
    description: 'Assessment teori utama yang biasanya dipakai untuk validasi kelulusan materi konsep.',
    durationMinutes: 60,
    passingScore: 80,
    defaultQuestionKind: 'multiple_choice',
    questionLabel: 'Soal ujian',
    emptyPrompt: 'Tulis soal ujian teori atau pertanyaan esai.',
    submissionMode: 'online_quiz',
    maxAttempts: 1,
    allowRetry: false,
    allowedExtensions: [],
  },
  {
    key: 'praktik',
    label: 'Ujian Praktik',
    description: 'Brief tugas praktik, checklist review, dan instruksi upload hasil kerja siswa.',
    durationMinutes: 90,
    passingScore: 80,
    defaultQuestionKind: 'essay',
    questionLabel: 'Brief praktik',
    emptyPrompt: 'Jelaskan brief tugas, output yang diminta, atau kriteria review admin.',
    submissionMode: 'file_upload',
    maxAttempts: 2,
    allowRetry: true,
    allowedExtensions: ['.pdf', '.docx', '.xlsx', '.pptx', '.jpg', '.png', '.zip'],
  },
];

const assessmentOrder = new Map(ASSESSMENT_EDITOR_CONFIG.map((config, index) => [config.key, index]));

function normalizeAssessmentType(type) {
  return String(type || '').toLowerCase();
}

function getAssessmentConfig(type) {
  const normalizedType = normalizeAssessmentType(type);
  return ASSESSMENT_EDITOR_CONFIG.find((item) => item.key === normalizedType) || ASSESSMENT_EDITOR_CONFIG[0];
}

function createModule(idPrefix = Date.now()) {
  return {
    id: `module-${idPrefix}-${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    summary: '',
    durationLabel: '',
    fileName: '',
    fileUrl: '',
    mimeType: '',
    sizeLabel: '',
  };
}

function createQuestion(kind = 'multiple_choice') {
  return {
    id: `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    prompt: '',
    choices: kind === 'multiple_choice' ? ['', '', '', ''] : [],
    answerKey: '',
    weight: 1,
  };
}

function createAssessmentDefinitionForm(type) {
  const config = getAssessmentConfig(type);

  return {
    id: '',
    type,
    title: config.label,
    summary: '',
    instructions: '',
    durationMinutes: String(config.durationMinutes),
    passingScore: String(config.passingScore),
    maxScore: '100',
    maxAttempts: String(config.maxAttempts),
    allowRetry: config.allowRetry,
    allowedExtensions: config.allowedExtensions.join(', '),
    isPublished: false,
    questions: [createQuestion(config.defaultQuestionKind)],
    createdAt: '',
    updatedAt: '',
  };
}

function buildAssessmentForm(definitions = [], courseId = null) {
  return ASSESSMENT_EDITOR_CONFIG.reduce((result, config) => {
    const matched = definitions.find((item) => (
      String(item.courseId) === String(courseId)
      && normalizeAssessmentType(item.type) === config.key
    )) || null;
    const questions = Array.isArray(matched?.questions) && matched.questions.length
      ? matched.questions.map((question) => {
        const optionSource = Array.isArray(question.options) && question.options.length
          ? question.options.map((option) => option.label || option.value || option.id || '')
          : Array.isArray(question.choices) && question.kind === 'multiple_choice'
            ? question.choices
            : [];
        const choices = question.kind === 'multiple_choice'
          ? [...optionSource, '', '', '', ''].slice(0, 4).map((choice) => String(choice || ''))
          : [];
        const answerValue = String(question.answer ?? question.answerKey ?? '');
        const matchedAnswerIndex = Array.isArray(question.options)
          ? question.options.findIndex((option) => (
            String(option.value || option.id || option.label) === answerValue
            || String(option.id || '').toLowerCase() === answerValue.toLowerCase()
            || String(option.label || '') === answerValue
          ))
          : -1;

        return {
          id: question.id || `question-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: question.kind === 'essay' ? 'essay' : 'multiple_choice',
          prompt: question.prompt || question.label || '',
          choices,
          answerKey: question.answerKey || (matchedAnswerIndex >= 0 ? String.fromCharCode(65 + matchedAnswerIndex) : ''),
          weight: String(question.weight ?? 1),
        };
      })
      : [createQuestion(config.defaultQuestionKind)];

    result[config.key] = matched
      ? {
        id: matched.id || '',
        type: config.key,
        title: matched.title || config.label,
        summary: matched.summary || matched.description || '',
        instructions: Array.isArray(matched.instructions) ? matched.instructions.join(' ') : matched.instructions || '',
        durationMinutes: String(matched.durationMinutes ?? config.durationMinutes),
        passingScore: String(matched.passingScore ?? config.passingScore),
        maxScore: String(matched.maxScore ?? 100),
        maxAttempts: String(matched.maxAttempts ?? config.maxAttempts),
        allowRetry: matched.allowRetry ?? config.allowRetry,
        allowedExtensions: Array.isArray(matched.allowedExtensions)
          ? matched.allowedExtensions.join(', ')
          : String(matched.allowedExtensions || config.allowedExtensions.join(', ')),
        isPublished: matched.isPublished !== false,
        questions,
        createdAt: matched.createdAt || '',
        updatedAt: matched.updatedAt || '',
      }
      : createAssessmentDefinitionForm(config.key);

    return result;
  }, {});
}

function createEmptyForm() {
  return {
    title: '',
    price: '',
    duration: '',
    level: 'Umum',
    description: '',
    brochureName: '',
    brochureUrl: '',
    modules: [createModule()],
    assessments: buildAssessmentForm(),
  };
}

function normalizeModules(course, courseModules = []) {
  if (courseModules.length > 0) {
    return courseModules.map((item) => ({
      id: item.id,
      title: item.title || '',
      summary: item.summary || '',
      durationLabel: item.durationLabel || item.duration || '',
      fileName: item.fileName || '',
      fileUrl: item.fileUrl || '',
      mimeType: item.mimeType || '',
      sizeLabel: item.sizeLabel || '',
    }));
  }

  if (Array.isArray(course.modules) && course.modules.length > 0) {
    return course.modules.map((item, index) => ({
      id: item.id || `module-${course.id}-${index + 1}`,
      title: item.title || '',
      summary: item.summary || '',
      durationLabel: item.durationLabel || item.duration || '',
      fileName: item.fileName || '',
      fileUrl: item.fileUrl || '',
      mimeType: item.mimeType || '',
      sizeLabel: item.sizeLabel || '',
    }));
  }

  if (Array.isArray(course.materials) && course.materials.length > 0) {
    return course.materials.map((item, index) => ({
      id: `module-${course.id}-${index + 1}`,
      title: typeof item === 'string' ? item : item?.title || `Modul ${index + 1}`,
      summary: typeof item === 'string' ? '' : item?.summary || '',
      durationLabel: '',
      fileName: '',
      fileUrl: '',
      mimeType: '',
      sizeLabel: '',
    }));
  }

  return [createModule(course.id)];
}

function getDefinitionQuestionSummary(definition) {
  const questionCount = Array.isArray(definition?.questions) ? definition.questions.length : 0;
  const multipleChoiceCount = Array.isArray(definition?.questions)
    ? definition.questions.filter((item) => item.kind === 'multiple_choice').length
    : 0;
  const essayCount = Math.max(0, questionCount - multipleChoiceCount);

  return {
    questionCount,
    multipleChoiceCount,
    essayCount,
  };
}

function buildModulesByCourseId(modules) {
  const map = new Map();

  modules.forEach((item) => {
    const key = String(item.courseId);
    const collection = map.get(key);

    if (collection) {
      collection.push(item);
      return;
    }

    map.set(key, [item]);
  });

  map.forEach((items) => {
    items.sort((left, right) => Number(left.order || 0) - Number(right.order || 0));
  });

  return map;
}

function buildAssessmentDefinitionsByCourseId(definitions) {
  const map = new Map();

  definitions.forEach((item) => {
    const key = String(item.courseId);
    const collection = map.get(key);

    if (collection) {
      collection.push(item);
      return;
    }

    map.set(key, [item]);
  });

  map.forEach((items) => {
    items.sort((left, right) => (
      (assessmentOrder.get(normalizeAssessmentType(left.type)) ?? Number.MAX_SAFE_INTEGER)
      - (assessmentOrder.get(normalizeAssessmentType(right.type)) ?? Number.MAX_SAFE_INTEGER)
    ));
  });

  return map;
}

function buildStudentCountsByCourseId(students) {
  const map = new Map();

  students.forEach((student) => {
    const key = String(student.courseId);
    map.set(key, (map.get(key) || 0) + 1);
  });

  return map;
}

const ModuleEditorCard = memo(function ModuleEditorCard({
  module,
  index,
  canMoveUp,
  canMoveDown,
  onMove,
  onRemove,
  onChange,
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <BookCopy size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Modul {index + 1}</p>
            <p className="text-xs text-slate-500">Modul ini akan otomatis memiliki file unduhan fallback jika admin belum menambahkan file manual.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onMove(module.id, 'up')}
            aria-label="Naikkan modul"
            disabled={!canMoveUp}
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onMove(module.id, 'down')}
            aria-label="Turunkan modul"
            disabled={!canMoveDown}
          >
            <ArrowDown size={14} />
          </button>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => onRemove(module.id)} aria-label="Hapus modul">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Judul modul</span>
          <input className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100" value={module.title} onChange={(event) => onChange(module.id, 'title', event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Durasi</span>
          <input className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100" value={module.durationLabel} onChange={(event) => onChange(module.id, 'durationLabel', event.target.value)} placeholder="1 Minggu" />
        </label>
      </div>

      <label className="mt-4 block space-y-2 text-sm font-medium text-slate-700">
        <span>Ringkasan modul</span>
        <textarea className="min-h-[96px] w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100" value={module.summary} onChange={(event) => onChange(module.id, 'summary', event.target.value)} />
      </label>
    </div>
  );
});

const AssessmentQuestionEditor = memo(function AssessmentQuestionEditor({
  config,
  question,
  index,
  onQuestionChange,
  onQuestionKindChange,
  onChoiceChange,
  onRemoveQuestion,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {config.questionLabel} {index + 1}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {config.key === 'praktik'
              ? 'Item ini bisa menjadi brief tugas, langkah kerja, atau checklist review.'
              : 'Atur jenis soal dan bobotnya agar penilaian lebih rapi.'}
          </p>
        </div>
        <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 text-rose-600 transition-colors hover:bg-rose-50" onClick={() => onRemoveQuestion(config.key, question.id)} aria-label={`Hapus ${config.questionLabel.toLowerCase()}`}>
          <Trash2 size={14} />
        </button>
      </div>

      <div className={`grid grid-cols-1 gap-4 ${config.key === 'praktik' ? 'sm:grid-cols-[1fr_120px]' : 'sm:grid-cols-[1fr_180px_120px]'}`}>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>{config.key === 'praktik' ? 'Brief / arahan' : 'Prompt pertanyaan'}</span>
          <textarea className="min-h-[88px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" value={question.prompt} onChange={(event) => onQuestionChange(config.key, question.id, 'prompt', event.target.value)} placeholder={config.emptyPrompt} />
        </label>

        {config.key !== 'praktik' ? (
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Jenis soal</span>
            <select className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" value={question.kind} onChange={(event) => onQuestionKindChange(config.key, question.id, event.target.value)}>
              <option value="multiple_choice">Pilihan ganda</option>
              <option value="essay">Esai</option>
            </select>
          </label>
        ) : null}

        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Bobot</span>
          <input type="number" min="1" className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" value={question.weight} onChange={(event) => onQuestionChange(config.key, question.id, 'weight', event.target.value)} />
        </label>
      </div>

      {question.kind === 'multiple_choice' ? (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-3">
            {question.choices.map((choice, choiceIndex) => (
              <label key={`${question.id}-choice-${choiceIndex}`} className="space-y-2 text-sm font-medium text-slate-700">
                <span>Opsi {String.fromCharCode(65 + choiceIndex)}</span>
                <input className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" value={choice} onChange={(event) => onChoiceChange(config.key, question.id, choiceIndex, event.target.value)} />
              </label>
            ))}
          </div>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Kunci jawaban</span>
            <select className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" value={question.answerKey} onChange={(event) => onQuestionChange(config.key, question.id, 'answerKey', event.target.value)}>
              <option value="">Pilih opsi benar</option>
              {question.choices.map((choice, choiceIndex) => (
                <option key={`${question.id}-answer-${choiceIndex}`} value={String.fromCharCode(65 + choiceIndex)}>
                  {String.fromCharCode(65 + choiceIndex)}{choice ? ` - ${choice}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </div>
  );
});

const AssessmentEditorCard = memo(function AssessmentEditorCard({
  config,
  definition,
  onFieldChange,
  onQuestionChange,
  onQuestionKindChange,
  onChoiceChange,
  onAddQuestion,
  onRemoveQuestion,
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <ClipboardCheck size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{config.label}</p>
            <p className="text-xs text-slate-500">{config.description}</p>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
            checked={definition.isPublished}
            onChange={(event) => onFieldChange(config.key, 'isPublished', event.target.checked)}
          />
          Tampilkan ke siswa
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <span>Judul assessment</span>
          <input className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100" value={definition.title} onChange={(event) => onFieldChange(config.key, 'title', event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Durasi (menit)</span>
          <input type="number" min="1" className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100" value={definition.durationMinutes} onChange={(event) => onFieldChange(config.key, 'durationMinutes', event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Nilai lulus</span>
          <input type="number" min="1" max="100" className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100" value={definition.passingScore} onChange={(event) => onFieldChange(config.key, 'passingScore', event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Maks. attempt</span>
          <input type="number" min="1" className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100" value={definition.maxAttempts} onChange={(event) => onFieldChange(config.key, 'maxAttempts', event.target.value)} />
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
        {config.key === 'praktik' ? (
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Format file diterima</span>
            <input className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100" value={definition.allowedExtensions} onChange={(event) => onFieldChange(config.key, 'allowedExtensions', event.target.value)} placeholder=".pdf, .docx, .zip" />
          </label>
        ) : (
          <div />
        )}
        <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
            checked={definition.allowRetry}
            onChange={(event) => onFieldChange(config.key, 'allowRetry', event.target.checked)}
          />
          Boleh ulang
        </label>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Ringkasan</span>
          <textarea className="min-h-[96px] w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100" value={definition.summary} onChange={(event) => onFieldChange(config.key, 'summary', event.target.value)} placeholder="Ringkasan singkat yang muncul pada dashboard siswa." />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Instruksi admin / siswa</span>
          <textarea className="min-h-[96px] w-full rounded-[24px] border border-slate-200 bg-white px-4 py-3 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100" value={definition.instructions} onChange={(event) => onFieldChange(config.key, 'instructions', event.target.value)} placeholder="Tambahkan arahan pengerjaan, aturan upload, atau poin penilaian." />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {config.key === 'praktik' ? 'Brief & kriteria review' : 'Bank pertanyaan'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {config.key === 'praktik'
                ? 'Gunakan item di bawah untuk menjelaskan brief praktik, output file, dan checklist review admin.'
                : 'Tambahkan soal pilihan ganda atau esai untuk assessment ini.'}
            </p>
          </div>
          <AdminSecondaryButton onClick={() => onAddQuestion(config.key)}>
            <Plus size={16} />
            {config.key === 'praktik' ? 'Tambah brief' : 'Tambah soal'}
          </AdminSecondaryButton>
        </div>

        <div className="space-y-3">
          {definition.questions.map((question, index) => (
            <AssessmentQuestionEditor
              key={question.id}
              config={config}
              question={question}
              index={index}
              onQuestionChange={onQuestionChange}
              onQuestionKindChange={onQuestionKindChange}
              onChoiceChange={onChoiceChange}
              onRemoveQuestion={onRemoveQuestion}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

const CourseListPanel = memo(function CourseListPanel({
  courseBundles,
  activeCourseId,
  onSelectCourse,
}) {
  return (
    <AdminSurface className="overflow-hidden p-0">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Daftar Paket Kursus</h2>
        <p className="mt-1 text-sm text-slate-500">Pilih paket untuk melihat detail, modul, dan definisi assessment yang melekat pada kursus.</p>
      </div>

      <div className="divide-y divide-slate-100">
        {courseBundles.map((bundle) => (
          <button
            key={bundle.course.id}
            type="button"
            onClick={() => onSelectCourse(bundle.course.id)}
            className={`flex w-full flex-col gap-3 px-5 py-5 text-left transition-colors hover:bg-emerald-50/40 sm:px-6 ${String(activeCourseId) === String(bundle.course.id) ? 'bg-emerald-50/70' : 'bg-white'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{bundle.course.title}</p>
                <p className="mt-1 text-sm text-slate-500">{bundle.course.duration} • {bundle.course.level || 'Umum'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminTag tone="blue">{bundle.modules.length} modul</AdminTag>
                <AdminTag tone={bundle.publishedAssessmentCount ? 'emerald' : 'slate'}>
                  {bundle.publishedAssessmentCount}/3 assessment aktif
                </AdminTag>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 text-xs text-slate-500 sm:grid-cols-3">
              <span>Harga: {bundle.course.priceLabel || bundle.course.price}</span>
              <span>Siswa aktif: {bundle.activeStudents}</span>
              <span>Assessment: {bundle.assessments.length}/3 terpasang</span>
            </div>
          </button>
        ))}
      </div>
    </AdminSurface>
  );
});

const CourseDetailPanel = memo(function CourseDetailPanel({
  selectedBundle,
  onEdit,
  onDeleteRequest,
}) {
  if (!selectedBundle) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-center text-sm text-slate-500">
        Pilih paket kursus dari daftar kiri untuk melihat detailnya.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{selectedBundle.course.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{selectedBundle.course.duration} • {selectedBundle.course.level || 'Umum'}</p>
        </div>
        <div className="flex gap-2">
          <AdminSecondaryButton onClick={() => onEdit(selectedBundle)}>
            <Edit3 size={16} />
            Edit
          </AdminSecondaryButton>
          <AdminSecondaryButton className="text-rose-600 hover:border-rose-200 hover:text-rose-700" onClick={() => onDeleteRequest(selectedBundle.course.id)}>
            <Trash2 size={16} />
            Hapus
          </AdminSecondaryButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/75 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Harga</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">{selectedBundle.course.priceLabel || selectedBundle.course.price}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/75 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Siswa aktif</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">{selectedBundle.activeStudents}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/75 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assessment aktif</p>
          <p className="mt-3 text-lg font-semibold text-slate-900">{selectedBundle.publishedAssessmentCount}/3</p>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-100 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">Deskripsi program</p>
        <p className="mt-3 text-sm leading-7 text-slate-500">{selectedBundle.course.description}</p>
      </div>

      <div className="rounded-[24px] border border-slate-100 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Assessment terpasang</p>
            <p className="mt-1 text-xs text-slate-500">Definition yang dipublish di sini akan muncul pada area assessment dashboard siswa.</p>
          </div>
          <AdminTag tone={selectedBundle.publishedAssessmentCount ? 'emerald' : 'slate'}>
            {selectedBundle.publishedAssessmentCount ? 'Siap dipakai' : 'Belum dipublish'}
          </AdminTag>
        </div>
        <div className="mt-4 space-y-3">
          {ASSESSMENT_EDITOR_CONFIG.map((config) => {
            const definition = selectedBundle.assessments.find((item) => normalizeAssessmentType(item.type) === config.key) || null;
            const summary = getDefinitionQuestionSummary(definition);

            return (
              <div key={config.key} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{config.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {definition?.summary || config.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminTag tone={definition?.isPublished !== false ? 'emerald' : 'slate'}>
                      {definition ? (definition.isPublished !== false ? 'Published' : 'Draft') : 'Belum dibuat'}
                    </AdminTag>
                    <AdminTag tone="blue">{summary.questionCount} item</AdminTag>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-slate-500 sm:grid-cols-5">
                  <span>Durasi: {definition?.durationMinutes || config.durationMinutes} menit</span>
                  <span>Nilai lulus: {definition?.passingScore || config.passingScore}</span>
                  <span>Attempt: {definition?.maxAttempts || config.maxAttempts}</span>
                  <span>Pilihan ganda: {summary.multipleChoiceCount}</span>
                  <span>Esai / brief: {summary.essayCount}</span>
                </div>
                {config.key === 'praktik' ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Format file: {Array.isArray(definition?.allowedExtensions) && definition.allowedExtensions.length ? definition.allowedExtensions.join(', ') : config.allowedExtensions.join(', ')}
                  </p>
                ) : null}
                {definition?.instructions ? (
                  <p className="mt-3 text-xs text-slate-500">{definition.instructions}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-100 bg-white p-5">
        <p className="text-sm font-semibold text-slate-900">Susunan modul</p>
        <div className="mt-4 space-y-3">
          {selectedBundle.modules.map((module, index) => (
            <div key={module.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{index + 1}. {module.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{module.summary || 'Ringkasan modul belum ditambahkan.'}</p>
                </div>
                <AdminTag tone="blue">{module.durationLabel || 'Fleksibel'}</AdminTag>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

function CourseEditorPanel({
  editorMode,
  form,
  formError,
  onCancel,
  onSave,
  onFieldChange,
  onModuleChange,
  onAddModule,
  onRemoveModule,
  onMoveModule,
  onAssessmentFieldChange,
  onAssessmentQuestionChange,
  onAssessmentQuestionKindChange,
  onAssessmentChoiceChange,
  onAddAssessmentQuestion,
  onRemoveAssessmentQuestion,
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">{editorMode === 'create' ? 'Tambah paket kursus' : 'Edit paket kursus'}</h2>
          <p className="mt-1 text-sm text-slate-500">Modul yang disimpan di sini akan langsung dipakai halaman Kelas Saya, dan definisi assessment akan dibaca dashboard siswa.</p>
        </div>
        <AdminSecondaryButton onClick={onCancel}>Batal</AdminSecondaryButton>
      </div>

      {formError ? <AdminNotice tone="rose" title="Form belum lengkap" description={formError} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Nama paket</span>
          <input className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" value={form.title} onChange={(event) => onFieldChange('title', event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Harga</span>
          <input className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" value={form.price} onChange={(event) => onFieldChange('price', event.target.value)} placeholder="Rp 500.000" />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Durasi</span>
          <input className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" value={form.duration} onChange={(event) => onFieldChange('duration', event.target.value)} placeholder="3 Bulan" />
        </label>
        <label className="space-y-2 text-sm font-medium text-slate-700">
          <span>Level</span>
          <input className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" value={form.level} onChange={(event) => onFieldChange('level', event.target.value)} />
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-slate-700">
        <span>Deskripsi</span>
        <textarea className="min-h-[110px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100" value={form.description} onChange={(event) => onFieldChange('description', event.target.value)} />
      </label>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Modul Kursus</h3>
            <p className="mt-1 text-sm text-slate-500">Urutan modul menentukan struktur belajar dan daftar unduhan siswa.</p>
          </div>
          <AdminSecondaryButton onClick={onAddModule}>
            <Plus size={16} />
            Tambah modul
          </AdminSecondaryButton>
        </div>

        <div className="space-y-4">
          {form.modules.map((module, index) => (
            <ModuleEditorCard
              key={module.id}
              module={module}
              index={index}
              canMoveUp={index > 0}
              canMoveDown={index < form.modules.length - 1}
              onMove={onMoveModule}
              onRemove={onRemoveModule}
              onChange={onModuleChange}
            />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Authoring Assessment</h3>
          <p className="mt-1 text-sm text-slate-500">Setiap kursus dapat memiliki tiga definition: latihan teori, ujian teori, dan ujian praktik.</p>
        </div>

        {ASSESSMENT_EDITOR_CONFIG.map((config) => (
          <AssessmentEditorCard
            key={config.key}
            config={config}
            definition={form.assessments[config.key]}
            onFieldChange={onAssessmentFieldChange}
            onQuestionChange={onAssessmentQuestionChange}
            onQuestionKindChange={onAssessmentQuestionKindChange}
            onChoiceChange={onAssessmentChoiceChange}
            onAddQuestion={onAddAssessmentQuestion}
            onRemoveQuestion={onRemoveAssessmentQuestion}
          />
        ))}
      </div>

      <AdminPrimaryButton onClick={onSave}>
        <Save size={18} />
        {editorMode === 'create' ? 'Simpan paket kursus' : 'Simpan perubahan'}
      </AdminPrimaryButton>
    </div>
  );
}

export default function AdminPaketKursus() {
  const coursesDomain = useCourses();
  const modulesDomain = useModules();
  const studentsDomain = useStudents();
  const enrollmentsDomain = useEnrollments();
  const assessmentDefinitionsDomain = useAssessmentDefinitions();
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [editorMode, setEditorMode] = useState(null);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [form, setForm] = useState(createEmptyForm);
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState({ title: '', description: '', tone: 'emerald' });

  const error = [
    coursesDomain.error,
    modulesDomain.error,
    studentsDomain.error,
    enrollmentsDomain.error,
    assessmentDefinitionsDomain.error,
  ].find(Boolean) || '';

  const modulesByCourseId = useMemo(() => buildModulesByCourseId(modulesDomain.modules), [modulesDomain.modules]);
  const assessmentDefinitionsByCourseId = useMemo(
    () => buildAssessmentDefinitionsByCourseId(assessmentDefinitionsDomain.assessmentDefinitions),
    [assessmentDefinitionsDomain.assessmentDefinitions],
  );
  const activeStudentsByCourseId = useMemo(() => buildStudentCountsByCourseId(studentsDomain.students), [studentsDomain.students]);

  const courseBundles = useMemo(() => (
    coursesDomain.courses.map((course) => {
      const courseKey = String(course.id);
      const assessments = assessmentDefinitionsByCourseId.get(courseKey) || [];
      const publishedAssessmentCount = assessments.filter((item) => item.isPublished !== false).length;

      return {
        course,
        modules: normalizeModules(course, modulesByCourseId.get(courseKey) || []),
        activeStudents: activeStudentsByCourseId.get(courseKey) || 0,
        assessments,
        publishedAssessmentCount,
      };
    })
  ), [
    activeStudentsByCourseId,
    assessmentDefinitionsByCourseId,
    coursesDomain.courses,
    modulesByCourseId,
  ]);

  const courseBundleById = useMemo(() => {
    const map = new Map();

    courseBundles.forEach((bundle) => {
      map.set(String(bundle.course.id), bundle);
    });

    return map;
  }, [courseBundles]);

  const selectedBundle = useMemo(() => (
    courseBundleById.get(String(selectedCourseId))
    || courseBundles[0]
    || null
  ), [courseBundleById, courseBundles, selectedCourseId]);

  const totalModules = useMemo(
    () => courseBundles.reduce((sum, item) => sum + item.modules.length, 0),
    [courseBundles],
  );
  const totalPublishedAssessments = useMemo(
    () => courseBundles.reduce((sum, item) => sum + item.publishedAssessmentCount, 0),
    [courseBundles],
  );

  const closeEditor = useCallback(() => {
    setEditorMode(null);
    setEditingCourseId(null);
    setForm(createEmptyForm());
    setFormError('');
  }, []);

  const openCreate = useCallback(() => {
    setEditorMode('create');
    setEditingCourseId(null);
    setForm(createEmptyForm());
    setFormError('');
  }, []);

  const openEdit = useCallback((bundle) => {
    const definitions = assessmentDefinitionsByCourseId.get(String(bundle.course.id)) || bundle.assessments;

    setEditorMode('edit');
    setEditingCourseId(bundle.course.id);
    setForm({
      title: bundle.course.title || '',
      price: bundle.course.priceLabel || bundle.course.price || '',
      duration: bundle.course.duration || '',
      level: bundle.course.level || 'Umum',
      description: bundle.course.description || '',
      brochureName: bundle.course.brochureName || '',
      brochureUrl: bundle.course.brochureUrl || '',
      modules: bundle.modules.length ? bundle.modules : [createModule(bundle.course.id)],
      assessments: buildAssessmentForm(definitions, bundle.course.id),
    });
    setFormError('');
  }, [assessmentDefinitionsByCourseId]);

  const updateField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const updateModule = useCallback((moduleId, field, value) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.map((module) => (
        module.id === moduleId
          ? { ...module, [field]: value }
          : module
      )),
    }));
  }, []);

  const addModule = useCallback(() => {
    setForm((current) => ({
      ...current,
      modules: [...current.modules, createModule()],
    }));
  }, []);

  const removeModule = useCallback((moduleId) => {
    setForm((current) => ({
      ...current,
      modules: current.modules.length === 1
        ? [createModule()]
        : current.modules.filter((module) => module.id !== moduleId),
    }));
  }, []);

  const moveModule = useCallback((moduleId, direction) => {
    setForm((current) => {
      const index = current.modules.findIndex((module) => module.id === moduleId);
      if (index === -1) {
        return current;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.modules.length) {
        return current;
      }

      const nextModules = [...current.modules];
      const [module] = nextModules.splice(index, 1);
      nextModules.splice(targetIndex, 0, module);
      return { ...current, modules: nextModules };
    });
  }, []);

  const updateAssessmentField = useCallback((type, field, value) => {
    setForm((current) => ({
      ...current,
      assessments: {
        ...current.assessments,
        [type]: {
          ...current.assessments[type],
          [field]: value,
        },
      },
    }));
  }, []);

  const updateAssessmentQuestion = useCallback((type, questionId, field, value) => {
    setForm((current) => ({
      ...current,
      assessments: {
        ...current.assessments,
        [type]: {
          ...current.assessments[type],
          questions: current.assessments[type].questions.map((question) => (
            question.id === questionId
              ? { ...question, [field]: value }
              : question
          )),
        },
      },
    }));
  }, []);

  const updateAssessmentQuestionKind = useCallback((type, questionId, kind) => {
    setForm((current) => ({
      ...current,
      assessments: {
        ...current.assessments,
        [type]: {
          ...current.assessments[type],
          questions: current.assessments[type].questions.map((question) => (
            question.id === questionId
              ? {
                ...question,
                kind,
                choices: kind === 'multiple_choice'
                  ? Array.isArray(question.choices) && question.choices.length
                    ? [...question.choices, '', '', '', ''].slice(0, 4)
                    : ['', '', '', '']
                  : [],
                answerKey: kind === 'multiple_choice' ? question.answerKey || '' : '',
              }
              : question
          )),
        },
      },
    }));
  }, []);

  const updateAssessmentChoice = useCallback((type, questionId, choiceIndex, value) => {
    setForm((current) => ({
      ...current,
      assessments: {
        ...current.assessments,
        [type]: {
          ...current.assessments[type],
          questions: current.assessments[type].questions.map((question) => {
            if (question.id !== questionId) {
              return question;
            }

            const nextChoices = [...question.choices];
            nextChoices[choiceIndex] = value;

            return {
              ...question,
              choices: nextChoices,
            };
          }),
        },
      },
    }));
  }, []);

  const addAssessmentQuestion = useCallback((type) => {
    const config = getAssessmentConfig(type);

    setForm((current) => ({
      ...current,
      assessments: {
        ...current.assessments,
        [type]: {
          ...current.assessments[type],
          questions: [...current.assessments[type].questions, createQuestion(config.defaultQuestionKind)],
        },
      },
    }));
  }, []);

  const removeAssessmentQuestion = useCallback((type, questionId) => {
    const config = getAssessmentConfig(type);

    setForm((current) => {
      const currentQuestions = current.assessments[type].questions;
      const nextQuestions = currentQuestions.length === 1
        ? [createQuestion(config.defaultQuestionKind)]
        : currentQuestions.filter((question) => question.id !== questionId);

      return {
        ...current,
        assessments: {
          ...current.assessments,
          [type]: {
            ...current.assessments[type],
            questions: nextQuestions,
          },
        },
      };
    });
  }, []);

  const saveCourse = useCallback(() => {
    if (!form.title.trim() || !form.price.trim() || !form.duration.trim() || !form.description.trim()) {
      setFormError('Lengkapi nama paket, harga, durasi, dan deskripsi kursus.');
      return;
    }

    if (form.modules.some((module) => !module.title.trim())) {
      setFormError('Setiap modul wajib memiliki judul.');
      return;
    }

    const invalidAssessment = ASSESSMENT_EDITOR_CONFIG.find((config) => {
      const definition = form.assessments[config.key];
      return definition.questions.some((question) => (
        question.kind === 'multiple_choice'
          ? !question.prompt.trim() || question.choices.every((choice) => !String(choice || '').trim()) || !question.answerKey
          : false
      ));
    });

    if (invalidAssessment) {
      setFormError(`Lengkapi prompt, minimal satu opsi, dan kunci jawaban pada ${invalidAssessment.label.toLowerCase()}.`);
      return;
    }

    const isEditing = editorMode === 'edit' && editingCourseId != null;
    const courseId = isEditing ? editingCourseId : Date.now();
    const now = new Date().toISOString();
    const normalizedModules = form.modules.map((module, index) => {
      const fallback = buildModuleDownloadFallback(form.title, module.title, module.summary);
      return {
        id: module.id || `mod-${courseId}-${index + 1}`,
        courseId,
        order: index + 1,
        title: module.title.trim(),
        summary: module.summary.trim(),
        durationLabel: module.durationLabel.trim(),
        fileName: module.fileName || fallback.fileName,
        fileUrl: module.fileUrl || fallback.fileUrl,
        mimeType: module.mimeType || fallback.mimeType,
        sizeLabel: module.sizeLabel || fallback.sizeLabel,
        updatedAt: now,
      };
    });

    const priceValue = Number(form.price.replace(/[^\d]/g, '')) || 0;
    const existingBundle = courseBundleById.get(String(editingCourseId));
    const nextCourse = {
      ...(existingBundle?.course || {}),
      id: courseId,
      title: form.title.trim(),
      aliases: [form.title.trim()],
      priceValue,
      price: form.price.trim() || formatCoursePrice(priceValue),
      priceLabel: form.price.trim() || formatCoursePrice(priceValue),
      duration: form.duration.trim(),
      level: form.level.trim() || 'Umum',
      description: form.description.trim(),
      brochureName: form.brochureName,
      brochureUrl: form.brochureUrl,
      icon: 'FileText',
      materials: normalizedModules.map((module) => module.title),
      modules: normalizedModules.map((module) => ({
        id: module.id,
        title: module.title,
        summary: module.summary,
        durationLabel: module.durationLabel,
      })),
      updatedAt: now,
    };

    const nextDefinitions = ASSESSMENT_EDITOR_CONFIG.map((config) => {
      const currentDefinition = form.assessments[config.key];
      const questions = currentDefinition.questions
        .map((question, index) => {
          const normalizedChoices = question.kind === 'multiple_choice'
            ? [...question.choices, '', '', '', ''].slice(0, 4).map((choice) => String(choice || '').trim())
            : [];
          const hasContent = question.prompt.trim() || normalizedChoices.some(Boolean);
          const optionItems = normalizedChoices
            .map((choice, choiceIndex) => ({
              id: String.fromCharCode(97 + choiceIndex),
              label: choice,
              value: choice,
            }))
            .filter((option) => option.label);
          const answerIndex = question.answerKey
            ? question.answerKey.toUpperCase().charCodeAt(0) - 65
            : -1;
          const answer = optionItems[answerIndex]?.value || '';

          if (!hasContent) {
            return null;
          }

          return {
            id: question.id || `question-${courseId}-${config.key}-${index + 1}`,
            kind: question.kind === 'essay' ? 'essay' : 'multiple_choice',
            prompt: question.prompt.trim(),
            options: question.kind === 'multiple_choice' ? optionItems : [],
            answer: question.kind === 'multiple_choice' ? answer : null,
            weight: Number(question.weight) > 0 ? Number(question.weight) : 1,
          };
        })
        .filter(Boolean);
      const allowedExtensions = String(currentDefinition.allowedExtensions || '')
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean);

      return {
        id: currentDefinition.id || `assessment-definition-${courseId}-${config.key}`,
        courseId,
        type: config.key,
        title: currentDefinition.title.trim() || config.label,
        summary: currentDefinition.summary.trim(),
        instructions: currentDefinition.instructions.trim(),
        durationMinutes: Number(currentDefinition.durationMinutes) > 0 ? Number(currentDefinition.durationMinutes) : config.durationMinutes,
        passingScore: Number(currentDefinition.passingScore) > 0 ? Number(currentDefinition.passingScore) : config.passingScore,
        maxScore: Number(currentDefinition.maxScore) > 0 ? Number(currentDefinition.maxScore) : 100,
        maxAttempts: Number(currentDefinition.maxAttempts) > 0 ? Number(currentDefinition.maxAttempts) : config.maxAttempts,
        allowRetry: Boolean(currentDefinition.allowRetry),
        allowedExtensions: allowedExtensions.length ? allowedExtensions : config.allowedExtensions,
        submissionMode: config.submissionMode,
        isPublished: Boolean(currentDefinition.isPublished),
        questions,
        updatedAt: now,
        createdAt: currentDefinition.createdAt || now,
      };
    });

    coursesDomain.setCourses((current) => (
      isEditing
        ? current.map((course) => (course.id === courseId ? nextCourse : course))
        : [nextCourse, ...current]
    ));

    modulesDomain.setModules((current) => {
      const filtered = current.filter((module) => String(module.courseId) !== String(courseId));
      return [...normalizedModules, ...filtered];
    });

    assessmentDefinitionsDomain.setAssessmentDefinitions((current) => {
      const filtered = current.filter((definition) => String(definition.courseId) !== String(courseId));
      return [...nextDefinitions, ...filtered];
    });

    studentsDomain.setStudents((current) => current.map((student) => (
      String(student.courseId) === String(courseId)
        ? { ...student, program: nextCourse.title }
        : student
    )));

    enrollmentsDomain.setEnrollments((current) => current.map((enrollment) => (
      String(enrollment.courseId) === String(courseId)
        ? { ...enrollment, program: nextCourse.title }
        : enrollment
    )));

    setSelectedCourseId(courseId);
    setToast({
      tone: 'emerald',
      title: isEditing ? 'Paket kursus diperbarui' : 'Paket kursus ditambahkan',
      description: 'Program, modul, dan definisi assessment kursus sudah tersinkron ke workspace siswa.',
    });
    closeEditor();
  }, [
    assessmentDefinitionsDomain,
    closeEditor,
    courseBundleById,
    coursesDomain,
    editorMode,
    editingCourseId,
    enrollmentsDomain,
    form,
    modulesDomain,
    studentsDomain,
  ]);

  const deleteCourse = useCallback(() => {
    if (!confirmDeleteId) {
      return;
    }

    const linkedEnrollment = enrollmentsDomain.enrollments.some((item) => String(item.courseId) === String(confirmDeleteId));
    if (linkedEnrollment) {
      setConfirmDeleteId(null);
      setToast({
        tone: 'amber',
        title: 'Paket tidak bisa dihapus',
        description: 'Masih ada siswa yang terdaftar pada paket ini. Pindahkan enrollment mereka lebih dulu.',
      });
      return;
    }

    coursesDomain.setCourses((current) => current.filter((course) => String(course.id) !== String(confirmDeleteId)));
    modulesDomain.setModules((current) => current.filter((module) => String(module.courseId) !== String(confirmDeleteId)));
    assessmentDefinitionsDomain.setAssessmentDefinitions((current) => current.filter((definition) => String(definition.courseId) !== String(confirmDeleteId)));
    if (String(selectedCourseId) === String(confirmDeleteId)) {
      setSelectedCourseId(null);
    }
    setConfirmDeleteId(null);
    setToast({
      tone: 'rose',
      title: 'Paket dihapus',
      description: 'Program kursus, modul, dan authoring assessment terkait sudah dihapus dari katalog.',
    });
  }, [
    assessmentDefinitionsDomain,
    confirmDeleteId,
    coursesDomain,
    enrollmentsDomain.enrollments,
    modulesDomain,
    selectedCourseId,
  ]);

  const reloadAll = useCallback(() => {
    coursesDomain.reload();
    modulesDomain.reload();
    studentsDomain.reload();
    enrollmentsDomain.reload();
    assessmentDefinitionsDomain.reload();
  }, [assessmentDefinitionsDomain, coursesDomain, enrollmentsDomain, modulesDomain, studentsDomain]);

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      {error ? (
        <AdminNotice
          tone="rose"
          title="Data paket kursus gagal dimuat"
          description={error}
          action={(
            <AdminSecondaryButton onClick={reloadAll}>
              Coba lagi
            </AdminSecondaryButton>
          )}
        />
      ) : null}

      <AdminHero
        icon={Package}
        title="Manajemen Paket Kursus"
        description="Kelola program, struktur modul, dan authoring assessment agar dashboard siswa membaca katalog belajar yang utuh."
        actions={(
          <AdminPrimaryButton onClick={openCreate}>
            <Plus size={18} />
            Tambah Paket
          </AdminPrimaryButton>
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:gap-5">
          <div className="rounded-2xl border border-emerald-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">Total Paket</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{coursesDomain.courses.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/70">Total Modul</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{totalModules}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/70">Assessment Aktif</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{totalPublishedAssessments}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Siswa Aktif</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{studentsDomain.students.length}</p>
          </div>
        </div>
      </AdminHero>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <CourseListPanel
          courseBundles={courseBundles}
          activeCourseId={selectedBundle?.course.id || null}
          onSelectCourse={setSelectedCourseId}
        />

        <AdminSurface className="p-5 sm:p-6 lg:p-7">
          {editorMode ? (
            <CourseEditorPanel
              editorMode={editorMode}
              form={form}
              formError={formError}
              onCancel={closeEditor}
              onSave={saveCourse}
              onFieldChange={updateField}
              onModuleChange={updateModule}
              onAddModule={addModule}
              onRemoveModule={removeModule}
              onMoveModule={moveModule}
              onAssessmentFieldChange={updateAssessmentField}
              onAssessmentQuestionChange={updateAssessmentQuestion}
              onAssessmentQuestionKindChange={updateAssessmentQuestionKind}
              onAssessmentChoiceChange={updateAssessmentChoice}
              onAddAssessmentQuestion={addAssessmentQuestion}
              onRemoveAssessmentQuestion={removeAssessmentQuestion}
            />
          ) : (
            <CourseDetailPanel
              selectedBundle={selectedBundle}
              onEdit={openEdit}
              onDeleteRequest={setConfirmDeleteId}
            />
          )}
        </AdminSurface>
      </div>

      <AdminConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Hapus paket kursus?"
        description="Program, modul, dan definition assessment terkait akan dihapus dari katalog jika sudah tidak memiliki enrollment aktif."
        confirmLabel="Hapus paket"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={deleteCourse}
      />

      <AdminToast
        tone={toast.tone}
        title={toast.title}
        description={toast.description}
        onClose={() => setToast({ title: '', description: '', tone: 'emerald' })}
      />
    </div>
  );
}
