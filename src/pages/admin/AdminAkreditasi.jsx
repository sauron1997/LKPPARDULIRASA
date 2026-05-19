import {
  AlertTriangle,
  Edit,
  Eye,
  FileCheck,
  FileText,
  Save,
  Shield,
  Trash2,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  formatAccreditationDate,
  getAccreditationStatus,
  useAccreditations,
} from '../../utils/useAccreditations';
import {
  AdminConfirmDialog,
  AdminEmptyState,
  AdminField,
  AdminHero,
  AdminInput,
  AdminLoadingState,
  AdminNotice,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminSectionCard,
  AdminSidebarPanel,
  AdminTag,
  AdminTextarea,
  AdminToast,
} from '../../components/admin/AdminUi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

const MAX_FILE_SIZE = 2.5 * 1024 * 1024;

const createEmptyForm = () => ({
  title: '',
  certificateNumber: '',
  description: '',
  expiryDate: '',
  documentUrl: '',
  documentName: '',
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('File PDF gagal dibaca. Coba upload ulang.'));

    reader.readAsDataURL(file);
  });
}

function AccreditationStatusTag({ status }) {
  const tone = status === 'Aktif' ? 'emerald' : 'rose';
  const Icon = status === 'Aktif' ? FileCheck : AlertTriangle;

  return (
    <AdminTag tone={tone} className="gap-1.5">
      <Icon size={12} />
      {status}
    </AdminTag>
  );
}

export default function AdminAkreditasi() {
  const [items, setItems, isReady, error, reload] = useAccreditations();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState({ title: '', description: '', tone: 'emerald' });
  const fileInputRef = useRef(null);

  const activeCount = items.filter((item) => item.status === 'Aktif').length;
  const inactiveCount = items.length - activeCount;
  const selectedDeleteItem = items.find((item) => item.id === confirmDeleteId) || null;

  const openCreateModal = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      certificateNumber: item.certificateNumber,
      description: item.description,
      expiryDate: item.expiryDate,
      documentUrl: item.documentUrl,
      documentName: item.documentName,
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(createEmptyForm());
    setFormError('');
  };

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setFormError('File sertifikat harus berformat PDF.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFormError('Ukuran file PDF maksimal 2.5 MB agar preview tetap ringan.');
      event.target.value = '';
      return;
    }

    try {
      const documentUrl = await readFileAsDataUrl(file);
      setForm((current) => ({
        ...current,
        documentUrl,
        documentName: file.name,
      }));
      setFormError('');
    } catch (error) {
      setFormError(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.title.trim()) {
      setFormError('Judul akreditasi wajib diisi.');
      return;
    }

    if (!form.certificateNumber.trim()) {
      setFormError('Nomor sertifikat wajib diisi.');
      return;
    }

    if (!form.description.trim()) {
      setFormError('Deskripsi akreditasi wajib diisi.');
      return;
    }

    if (!form.expiryDate) {
      setFormError('Masa berlaku akreditasi wajib diisi.');
      return;
    }

    if (!form.documentUrl) {
      setFormError('File sertifikat akreditasi wajib diupload dalam format PDF.');
      return;
    }

    const payload = {
      id: editingId || Date.now(),
      title: form.title.trim(),
      certificateNumber: form.certificateNumber.trim(),
      description: form.description.trim(),
      expiryDate: form.expiryDate,
      year: String(new Date(form.expiryDate).getFullYear()),
      status: getAccreditationStatus(form.expiryDate),
      documentUrl: form.documentUrl,
      documentName: form.documentName || `${form.title.trim()}.pdf`,
    };

    try {
      setItems((current) => (
        editingId
          ? current.map((item) => (item.id === editingId ? payload : item))
          : [payload, ...current]
      ));

      setToast({
        tone: 'emerald',
        title: editingId ? 'Dokumen diperbarui' : 'Dokumen ditambahkan',
        description: 'Data akreditasi sekarang sudah sinkron dengan panel admin.',
      });
      closeModal();
    } catch (saveError) {
      setFormError(saveError?.message || 'Dokumen gagal disimpan. Coba lagi.');
    }
  };

  const handleDelete = () => {
    if (!confirmDeleteId) {
      return;
    }

    setItems((current) => current.filter((item) => item.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    setToast({
      tone: 'rose',
      title: 'Dokumen dihapus',
      description: 'Dokumen akreditasi telah dihapus dari daftar publik admin.',
    });
  };

  if (!isReady) {
    return (
      <AdminLoadingState
        title="Memuat workspace akreditasi..."
        description="Dokumen, status, dan metadata akreditasi sedang disiapkan."
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      <AdminHero
        icon={Shield}
        title="Manajemen Akreditasi"
        description="Tambah, edit, hapus, dan tampilkan dokumen akreditasi lembaga ke halaman publik dengan workspace yang lebih konsisten."
        actions={(
          <AdminPrimaryButton onClick={openCreateModal}>
            <Upload size={16} />
            Upload Dokumen
          </AdminPrimaryButton>
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5">
          <div className="rounded-2xl border border-emerald-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">Total Dokumen</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/70">Aktif</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-700/70">Tidak Aktif</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{inactiveCount}</p>
          </div>
        </div>
      </AdminHero>

      {error ? (
        <AdminNotice
          tone="rose"
          title="Data akreditasi gagal dimuat"
          description={error}
          action={(
            <AdminSecondaryButton onClick={reload}>
              Coba lagi
            </AdminSecondaryButton>
          )}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <AdminSectionCard
          title="Daftar Dokumen Akreditasi"
          description="Semua dokumen yang tampil di halaman publik dan siap dikelola dari admin."
          action={<AdminTag tone="emerald">{items.length} dokumen</AdminTag>}
          bodyClassName="px-0 py-0"
        >
          <div className="border-b border-slate-100 bg-slate-50/65 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
                <Shield size={16} className="text-emerald-600" />
                <span>{items.length} dokumen akreditasi</span>
              </div>
              <AdminTag tone="blue">Dokumen publik</AdminTag>
            </div>
          </div>

          <div className="overflow-hidden rounded-b-[26px]">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50/90">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-auto px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">No</TableHead>
                  <TableHead className="h-auto px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Informasi Akreditasi</TableHead>
                  <TableHead className="h-auto px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Masa Berlaku</TableHead>
                  <TableHead className="h-auto px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">File PDF</TableHead>
                  <TableHead className="h-auto px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</TableHead>
                  <TableHead className="h-auto px-6 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white">
                {items.map((item, index) => (
                  <TableRow key={item.id} className="group hover:bg-emerald-50/35">
                    <TableCell className="px-6 py-4 text-sm text-slate-500">{index + 1}</TableCell>
                    <TableCell className="px-6 py-4 align-top">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-600">{item.certificateNumber}</span>
                          <span>{item.year}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-slate-600">
                      {formatAccreditationDate(item.expiryDate)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {item.documentUrl ? (
                        <a
                          className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                          href={item.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Eye size={14} />
                          Preview PDF
                        </a>
                      ) : (
                        <span className="text-xs italic text-slate-400">Belum ada file</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <AccreditationStatusTag status={item.status} />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AdminSecondaryButton
                          className="h-10 w-10 px-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          onClick={() => openEditModal(item)}
                          aria-label="Edit dokumen"
                        >
                          <Edit size={16} />
                        </AdminSecondaryButton>
                        <AdminSecondaryButton
                          className="h-10 w-10 px-0 text-rose-600 hover:border-rose-200 hover:text-rose-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          onClick={() => setConfirmDeleteId(item.id)}
                          aria-label="Hapus dokumen"
                        >
                          <Trash2 size={16} />
                        </AdminSecondaryButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {items.length === 0 ? (
              <div className="px-6 py-12">
                <AdminEmptyState
                  icon={Shield}
                  title="Belum ada dokumen akreditasi"
                  description="Klik Upload Dokumen untuk menambahkan data akreditasi pertama."
                />
              </div>
            ) : null}
          </div>
        </AdminSectionCard>

        <AdminSidebarPanel
          title="Catatan Workspace"
          description="Panel ringkas untuk menjaga kualitas dokumen yang dipublikasikan."
          action={<AdminTag tone="amber">PDF only</AdminTag>}
          contentClassName="mt-6 space-y-4"
        >
          <div className="rounded-[24px] border border-slate-100 bg-slate-50/80 p-4">
            <p className="text-sm font-semibold text-slate-900">Checklist dokumen</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <span>Format PDF</span>
                <AdminTag tone="emerald">Wajib</AdminTag>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <span>Ukuran file</span>
                <AdminTag tone="blue">Max 2.5 MB</AdminTag>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <span>Status aktif</span>
                <AdminTag tone="emerald">{activeCount}</AdminTag>
              </div>
            </div>
          </div>

          <AdminNotice
            tone="slate"
            title="Tips publikasi"
            description="Gunakan judul yang konsisten, nomor sertifikat yang lengkap, dan masa berlaku yang akurat agar dokumen mudah diverifikasi."
          />

          <AdminNotice
            tone="amber"
            title="Perlu perhatian"
            description="Dokumen yang masa berlakunya berakhir akan otomatis masuk status tidak aktif pada tampilan admin."
          />
        </AdminSidebarPanel>
      </div>

      <Dialog open={showModal} onOpenChange={(open) => (open ? setShowModal(true) : closeModal())}>
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-hidden rounded-[28px] border border-white/80 bg-white p-0 sm:max-w-5xl"
          showCloseButton
        >
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-950">
              <Shield className="text-emerald-600" size={20} />
              {editingId ? 'Edit Dokumen Akreditasi' : 'Upload Dokumen Akreditasi'}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-500">
              Simpan metadata dokumen, preview PDF, dan status akreditasi dalam satu workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="grid max-h-[calc(90vh-152px)] grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(320px,0.88fr)]">
            <div className="border-b border-slate-100 px-6 py-6 md:border-b-0 md:border-r">
              <form id="accreditation-form" onSubmit={handleSubmit} className="space-y-5">
                {formError ? (
                  <AdminNotice
                    tone="rose"
                    title="Data belum lengkap"
                    description={formError}
                  />
                ) : null}

                <AdminField label="Judul Akreditasi" htmlFor="accreditation-title">
                  <AdminInput
                    id="accreditation-title"
                    value={form.title}
                    onChange={(event) => handleChange('title', event.target.value)}
                    placeholder="Contoh: Akreditasi LKP Parduli Rasa Komputer"
                    required
                  />
                </AdminField>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <AdminField label="Nomor Sertifikat" htmlFor="accreditation-certificate-number">
                    <AdminInput
                      id="accreditation-certificate-number"
                      value={form.certificateNumber}
                      onChange={(event) => handleChange('certificateNumber', event.target.value)}
                      className="font-mono text-sm"
                      placeholder="BAN-PNF/LKP/2026/001"
                      required
                    />
                  </AdminField>

                  <AdminField label="Masa Berlaku" htmlFor="accreditation-expiry-date">
                    <AdminInput
                      id="accreditation-expiry-date"
                      type="date"
                      value={form.expiryDate}
                      onChange={(event) => handleChange('expiryDate', event.target.value)}
                      required
                    />
                  </AdminField>
                </div>

                <AdminField label="Deskripsi Akreditasi" htmlFor="accreditation-description">
                  <AdminTextarea
                    id="accreditation-description"
                    value={form.description}
                    onChange={(event) => handleChange('description', event.target.value)}
                    className="min-h-[120px] resize-none"
                    placeholder="Jelaskan informasi singkat tentang dokumen akreditasi yang diunggah"
                    required
                  />
                </AdminField>

                <AdminField
                  label="File Sertifikat PDF"
                  helper={form.documentName || 'Ukuran disarankan maksimal 2.5 MB'}
                >
                  <label
                    role="button"
                    tabIndex={0}
                    className="flex min-h-[148px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-4 text-center transition-colors hover:border-emerald-200 hover:bg-emerald-50/35 focus-visible:border-emerald-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    aria-label="Pilih file sertifikat PDF"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)]">
                      <Upload size={20} />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-800">
                      {form.documentName ? 'Ganti file PDF' : 'Pilih file PDF'}
                    </p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">
                      File dipakai untuk preview internal dan tautan dokumen di halaman publik.
                    </p>
                    <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf" onChange={handleFileChange} />
                  </label>
                </AdminField>
              </form>
            </div>

            <div className="bg-slate-50/70 px-6 py-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Preview Dokumen</p>
                  <p className="mt-1 text-sm text-slate-500">Pastikan isi PDF bisa dibuka dan metadata sudah cocok.</p>
                </div>
                {form.expiryDate ? (
                  <AdminTag tone={getAccreditationStatus(form.expiryDate) === 'Aktif' ? 'emerald' : 'rose'}>
                    Berlaku s/d {formatAccreditationDate(form.expiryDate)}
                  </AdminTag>
                ) : null}
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-[24px] border border-slate-100 bg-white p-4">
                  <div className="flex flex-wrap gap-2">
                    {form.certificateNumber ? <AdminTag tone="blue">{form.certificateNumber}</AdminTag> : null}
                    {form.expiryDate ? (
                      <AccreditationStatusTag status={getAccreditationStatus(form.expiryDate)} />
                    ) : null}
                    {form.documentName ? <AdminTag>{form.documentName}</AdminTag> : null}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    {form.title || 'Judul dokumen akan muncul di sini'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {form.description || 'Deskripsi singkat dokumen akan membantu admin memverifikasi isi akreditasi sebelum dipublikasikan.'}
                  </p>
                </div>

                <div className="min-h-[420px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.2)]">
                  {form.documentUrl ? (
                    <object
                      data={form.documentUrl}
                      type="application/pdf"
                      className="h-[420px] w-full"
                      aria-label="Preview dokumen akreditasi"
                    >
                      <div className="flex h-[420px] flex-col items-center justify-center px-8 text-center">
                        <FileText size={44} className="text-slate-300" />
                        <p className="mt-4 text-sm font-semibold text-slate-700">Browser tidak mendukung preview PDF.</p>
                        <a
                          href={form.documentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                          <Eye size={16} />
                          Buka PDF di tab baru
                        </a>
                      </div>
                    </object>
                  ) : (
                    <div className="flex h-[420px] flex-col items-center justify-center px-8 text-center">
                      <Upload size={44} className="text-slate-300" />
                      <p className="mt-4 text-sm font-semibold text-slate-700">Belum ada file yang dipilih</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        Upload file PDF agar preview dokumen dan status akreditasi bisa dicek langsung dari panel ini.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 bg-white px-6 py-4">
            <AdminSecondaryButton onClick={closeModal}>
              Batal
            </AdminSecondaryButton>
            <AdminPrimaryButton type="submit" form="accreditation-form">
              <Save size={16} />
              {editingId ? 'Simpan Perubahan' : 'Simpan Dokumen'}
            </AdminPrimaryButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Hapus dokumen akreditasi ini?"
        description={
          selectedDeleteItem
            ? `Dokumen "${selectedDeleteItem.title}" akan dihapus dari daftar admin dan tidak lagi tampil di halaman publik.`
            : 'Dokumen akreditasi akan dihapus dari daftar admin dan tidak lagi tampil di halaman publik.'
        }
        confirmLabel="Hapus dokumen"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
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
