import { CalendarRange, Download, Eye, FileText, Shield } from 'lucide-react';
import { usePublicAccreditationsQuery } from '../../hooks/public/usePublicQueries';
import SEO from '../../components/SEO/SEO';
import './Pages.css';

function parseDateInput(value) {
  if (!value || typeof value !== 'string') return null;

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function getAccreditationStatus(expiryDate, fallbackStatus = 'Aktif') {
  const parsedDate = parseDateInput(expiryDate);
  if (!parsedDate) return fallbackStatus || 'Belum diatur';

  const expiryAtEndOfDay = new Date(parsedDate);
  expiryAtEndOfDay.setHours(23, 59, 59, 999);

  return expiryAtEndOfDay < new Date() ? 'Berakhir' : 'Aktif';
}

function formatAccreditationDate(expiryDate) {
  const parsedDate = parseDateInput(expiryDate);
  if (!parsedDate) return 'Belum diatur';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
}

function normalizeAccreditation(item) {
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

export default function AkreditasiPage() {
  const { data } = usePublicAccreditationsQuery();
  const accreditations = (data || []).map(normalizeAccreditation);

  return (
    <div className="page-wrapper">
      <SEO title="Akreditasi" description="Dokumen akreditasi dan legalitas LKP Parduli Rasa Komputer." />
      <div className="page-hero">
        <div className="container">
          <h1>Akreditasi</h1>
          <p>Dokumen akreditasi dan legalitas LKP Parduli Rasa Komputer</p>
        </div>
      </div>
      <div className="container section">
        <div className="akreditasi-intro card">
          <div className="akreditasi-intro-icon">
            <Shield size={26} />
          </div>
          <div>
            <h2>Dokumen Akreditasi LKP</h2>
            <p>Publik dapat melihat ringkasan akreditasi, nomor sertifikat, masa berlaku, dan preview PDF dokumen yang diunggah admin.</p>
          </div>
        </div>

        <div className="akreditasi-grid">
          {accreditations.map(acc => (
            <div key={acc.id} className="akreditasi-card card">
              <div className="akreditasi-image akreditasi-document">
                {acc.documentUrl ? (
                  <object data={acc.documentUrl} type="application/pdf" aria-label={`Preview ${acc.title}`}>
                    <div className="akreditasi-placeholder">
                      <FileText size={42} />
                      <span>Preview PDF tidak tersedia di browser ini.</span>
                    </div>
                  </object>
                ) : (
                  <div className="akreditasi-placeholder">
                    <Shield size={48} />
                    <span>Dokumen PDF belum diunggah</span>
                  </div>
                )}
              </div>
              <div className="card-body">
                <div className="akreditasi-status">
                  <span className={`badge ${acc.status === 'Aktif' ? 'badge-success' : 'badge-warning'}`}>{acc.status}</span>
                  <span className="akreditasi-year">{acc.year}</span>
                </div>
                <h3>{acc.title}</h3>
                <p>{acc.description}</p>

                <div className="akreditasi-meta">
                  <div className="akreditasi-meta-item">
                    <FileText size={15} />
                    <span>{acc.certificateNumber || 'Nomor sertifikat belum tersedia'}</span>
                  </div>
                  <div className="akreditasi-meta-item">
                    <CalendarRange size={15} />
                    <span>Berlaku sampai {formatAccreditationDate(acc.expiryDate)}</span>
                  </div>
                </div>

                <div className="akreditasi-actions">
                  {acc.documentUrl ? (
                    <>
                      <a className="btn btn-outline btn-sm" href={acc.documentUrl} target="_blank" rel="noreferrer">
                        <Eye size={14} /> Lihat PDF
                      </a>
                      <a className="btn btn-primary btn-sm" href={acc.documentUrl} download={acc.documentName || `${acc.title}.pdf`}>
                        <Download size={14} /> Unduh Dokumen
                      </a>
                    </>
                  ) : (
                    <button className="btn btn-outline btn-sm" style={{ width: '100%' }} disabled>
                      <FileText size={14} /> Dokumen Belum Tersedia
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {accreditations.length === 0 && (
          <div className="card akreditasi-empty">
            <Shield size={36} />
            <h3>Dokumen akreditasi belum tersedia</h3>
            <p>Admin belum mengunggah data akreditasi untuk ditampilkan kepada publik.</p>
          </div>
        )}
      </div>
    </div>
  );
}
