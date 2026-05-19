import { useAccreditationsDomain } from '../hooks/admin/useAccreditationsDomain';

function parseDateInput(value) {
  if (!value || typeof value !== 'string') return null;

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

export function getAccreditationStatus(expiryDate, fallbackStatus = 'Aktif') {
  const parsedDate = parseDateInput(expiryDate);
  if (!parsedDate) return fallbackStatus || 'Belum diatur';

  const expiryAtEndOfDay = new Date(parsedDate);
  expiryAtEndOfDay.setHours(23, 59, 59, 999);

  return expiryAtEndOfDay < new Date() ? 'Berakhir' : 'Aktif';
}

export function formatAccreditationDate(expiryDate) {
  const parsedDate = parseDateInput(expiryDate);
  if (!parsedDate) return 'Belum diatur';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
}

export function normalizeAccreditation(item) {
  const expiryDate = item.expiryDate || '';
  const title = item.title || '';
  const documentUrl = item.documentUrl || item.document || '';
  const documentName =
    item.documentName || item.fileName || (documentUrl ? `${title || 'dokumen-akreditasi'}.pdf` : '');

  return {
    id: item.id || Date.now(),
    title,
    certificateNumber: item.certificateNumber || item.certificateNo || '',
    description: item.description || '',
    expiryDate,
    year: String(item.year || (expiryDate ? parseDateInput(expiryDate)?.getFullYear() : '-')),
    status: getAccreditationStatus(expiryDate, item.status),
    documentUrl,
    documentName,
  };
}

export function useAccreditations() {
  const { items, setItems, isReady, error, reload } = useAccreditationsDomain();

  return [items.map(normalizeAccreditation), setItems, isReady, error, reload];
}
