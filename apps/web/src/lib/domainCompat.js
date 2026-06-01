export * from '@lkp-parduli-rasa/domain';

export const ASSESSMENT_PROGRESS_STORAGE_KEY = 'lkp-domain-assessment-progress';
export const ASSESSMENT_SUBMISSION_STORAGE_KEY = 'lkp-domain-assessment-submissions';
export const CLASSWORK_RESULT_STORAGE_KEY = 'lkp-domain-classwork-results';
export const CLASSWORK_SUBMISSION_STORAGE_KEY = 'lkp-domain-classwork-submissions';

export const defaultCategories = [
  { id: 1, name: 'Edukasi' },
  { id: 2, name: 'Tips & Trik' },
  { id: 3, name: 'Kegiatan' },
  { id: 4, name: 'Pengumuman' },
  { id: 5, name: 'Microsoft Word' },
  { id: 6, name: 'Microsoft Excel' },
  { id: 7, name: 'Microsoft PowerPoint' },
  { id: 8, name: 'Desain Grafis' },
];

export function formatCoursePrice(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}
