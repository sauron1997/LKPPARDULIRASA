import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Edit,
  FileVideo,
  Filter,
  Image as ImageIcon,
  LayoutGrid,
  Plus,
  Save,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useGallery } from '../../hooks/admin/useGallery';
import {
  AdminConfirmDialog,
  AdminEmptyState,
  AdminField,
  AdminHero,
  AdminInfoPanel,
  AdminMetricCard,
  AdminNotice,
  AdminPanelTitle,
  AdminPrimaryButton,
  AdminSearchInput,
  AdminSecondaryButton,
  AdminSurface,
  AdminTag,
  AdminToast,
} from '../../components/admin/AdminUi';

const initialGalleryTags = ['Kursus Komputer', 'Microsoft Office', 'Desain Grafis', 'Sertifikasi'];

const createEmptyForm = () => ({
  title: '',
  description: '',
  tags: [],
  media: [],
});

function getCover(item) {
  return item.media?.[0] || (item.image ? {
    id: `${item.id}-cover`,
    name: item.title,
    type: item.type === 'video' ? 'video' : 'photo',
    url: item.image,
  } : null);
}

export default function AdminGaleri() {
  const { items, setItems, error, reload } = useGallery();
  const [managedTags, setManagedTags] = useState(initialGalleryTags);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Semua');
  const [form, setForm] = useState(createEmptyForm());
  const [tagDraft, setTagDraft] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState(null);
  const [editingTagValue, setEditingTagValue] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [toast, setToast] = useState({ title: '', description: '', tone: 'emerald' });

  const availableTags = useMemo(() => (
    Array.from(new Set([
      ...managedTags,
      ...items.flatMap((item) => item.tags || []).filter(Boolean),
    ]))
  ), [items, managedTags]);

  const filters = ['Semua', ...availableTags];

  const filteredItems = useMemo(() => items.filter((item) => {
    const matchesSearch = `${item.title} ${item.description} ${(item.tags || []).join(' ')}`.toLowerCase().includes(search.toLowerCase());
    const matchesTag = activeFilter === 'Semua' || (item.tags || []).includes(activeFilter);
    return matchesSearch && matchesTag;
  }), [items, search, activeFilter]);

  const selectedItem = filteredItems.find((item) => item.id === selectedItemId) || filteredItems[0] || null;
  const totalVideos = items.filter((item) => item.type === 'video' || item.media?.some((media) => media.type === 'video')).length;
  const totalPhotos = Math.max(0, items.length - totalVideos);
  const totalAssets = items.reduce((count, item) => count + Math.max(1, item.media?.length || 0), 0);

  const galleryMetrics = [
    { label: 'Koleksi', value: items.length, hint: 'Album aktif', icon: LayoutGrid, tone: 'emerald' },
    { label: 'Foto', value: totalPhotos, hint: 'Visual statis', icon: ImageIcon, tone: 'blue' },
    { label: 'Video', value: totalVideos, hint: 'Dokumentasi gerak', icon: FileVideo, tone: 'amber' },
    { label: 'Total Asset', value: totalAssets, hint: 'Media tersimpan', icon: Upload, tone: 'slate' },
  ];

  const openCreateModal = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setTagDraft('');
    setEditingTagIndex(null);
    setEditingTagValue('');
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description,
      tags: item.tags || [],
      media: item.media || [],
    });
    setTagDraft('');
    setEditingTagIndex(null);
    setEditingTagValue('');
    setFormError('');
    setSelectedItemId(item.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(createEmptyForm());
    setTagDraft('');
    setEditingTagIndex(null);
    setEditingTagValue('');
    setFormError('');
  };

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleTagToggle = (tagName) => {
    setForm((current) => {
      const tagExists = current.tags.includes(tagName);
      return {
        ...current,
        tags: tagExists
          ? current.tags.filter((tag) => tag !== tagName)
          : [...current.tags, tagName],
      };
    });
  };

  const addTag = () => {
    const nextTag = tagDraft.trim();
    if (!nextTag) return;

    setManagedTags((current) => (
      current.includes(nextTag) ? current : [...current, nextTag]
    ));
    setForm((current) => ({
      ...current,
      tags: current.tags.includes(nextTag) ? current.tags : [...current.tags, nextTag],
    }));
    setTagDraft('');
  };

  const startEditTag = (index, tagName) => {
    setEditingTagIndex(index);
    setEditingTagValue(tagName);
  };

  const saveEditedTag = () => {
    const nextTag = editingTagValue.trim();
    if (!nextTag || editingTagIndex === null) return;

    const previousTag = availableTags[editingTagIndex];
    setManagedTags((current) => (
      current.map((tag, index) => (index === editingTagIndex ? nextTag : tag))
    ));
    setForm((current) => ({
      ...current,
      tags: current.tags.map((tag) => (tag === previousTag ? nextTag : tag)),
    }));
    setItems((current) => (
      current.map((item) => ({
        ...item,
        tags: (item.tags || []).map((tag) => (tag === previousTag ? nextTag : tag)),
      }))
    ));
    setEditingTagIndex(null);
    setEditingTagValue('');
  };

  const deleteTag = (tagName) => {
    setManagedTags((current) => current.filter((tag) => tag !== tagName));
    setForm((current) => ({
      ...current,
      tags: current.tags.filter((tag) => tag !== tagName),
    }));
    setItems((current) => (
      current.map((item) => ({
        ...item,
        tags: (item.tags || []).filter((tag) => tag !== tagName),
      }))
    ));

    if (activeFilter === tagName) {
      setActiveFilter('Semua');
    }
  };

  const handleFilesChange = async (event) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));

    const previews = await Promise.all(validFiles.map((file, index) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' : 'photo',
        url: String(reader.result || ''),
        isObjectUrl: false,
      });
      reader.onerror = () => reject(new Error(`Media ${file.name} gagal dibaca.`));
      reader.readAsDataURL(file);
    })));

    setForm((current) => ({
      ...current,
      media: [...current.media, ...previews],
    }));
    event.target.value = '';
  };

  const removeMedia = (mediaId) => {
    setForm((current) => ({
      ...current,
      media: current.media.filter((media) => media.id !== mediaId),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError('');

    const payload = {
      id: editingId || Date.now(),
      title: form.title.trim(),
      description: form.description.trim(),
      tags: form.tags,
      media: form.media,
      type: form.media.some((media) => media.type === 'video') ? 'video' : 'photo',
      image: form.media.find((media) => media.type === 'photo')?.url || null,
    };

    if (!payload.title || !payload.description) {
      setFormError('Judul dan deskripsi galeri wajib diisi.');
      return;
    }

    if (payload.media.length === 0) {
      setFormError('Pilih minimal satu foto atau video untuk diunggah.');
      return;
    }

    if (editingId) {
      setItems((current) => current.map((item) => (item.id === editingId ? payload : item)));
      setSelectedItemId(editingId);
    } else {
      setItems((current) => [payload, ...current]);
      setSelectedItemId(payload.id);
    }

    setToast({
      tone: 'emerald',
      title: editingId ? 'Koleksi diperbarui' : 'Media berhasil diunggah',
      description: 'Perubahan galeri sekarang langsung terbaca oleh halaman publik.',
    });
    closeModal();
  };

  const handleDelete = () => {
    if (!confirmDeleteId) return;

    setItems(items.filter((item) => item.id !== confirmDeleteId));
    setConfirmDeleteId(null);
    setToast({
      tone: 'rose',
      title: 'Item galeri dihapus',
      description: 'Koleksi media telah dihapus dari dashboard dan halaman publik.',
    });
  };

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      {error ? (
        <AdminNotice
          tone="rose"
          title="Data galeri gagal dimuat"
          description={error}
          action={<AdminSecondaryButton onClick={reload}>Coba lagi</AdminSecondaryButton>}
        />
      ) : null}

      <AdminHero
        icon={ImageIcon}
        title="Manajemen Galeri"
        description="Kelola dokumentasi kegiatan, susun tag, dan pantau koleksi visual lembaga dalam satu media library yang lebih tertata."
        actions={(
          <>
            <AdminSearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, deskripsi, atau tag..."
            />
            <AdminPrimaryButton onClick={openCreateModal}>
              <Upload size={18} />
              Upload Media
            </AdminPrimaryButton>
          </>
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
          {galleryMetrics.map((metric) => (
            <AdminMetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </AdminHero>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:gap-7 2xl:gap-8">
        <AdminSurface className="p-5 sm:p-6 lg:p-7">
          <AdminPanelTitle
            title="Media Library"
            description="Gunakan filter tag dan pilih item untuk melihat detail tanpa keluar dari daftar."
          />

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
              <Filter size={14} />
              Filter
            </div>
            {filters.map((filterName) => (
              <button
                key={filterName}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeFilter === filterName ? 'bg-emerald-600 text-white shadow-[0_14px_34px_-22px_rgba(5,150,105,0.9)]' : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700'}`}
                onClick={() => setActiveFilter(filterName)}
              >
                {filterName}
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-3">
            {filteredItems.map((item, index) => {
              const cover = getCover(item);
              const isSelected = selectedItem?.id === item.id;
              const tileClassName = index % 5 === 0 ? 'sm:col-span-2 xl:col-span-2' : '';

              return (
                <article
                  key={item.id}
                  className={`group overflow-hidden rounded-[26px] border bg-white shadow-[0_18px_45px_-32px_rgba(15,23,42,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_55px_-30px_rgba(15,23,42,0.28)] ${isSelected ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-slate-100'} ${tileClassName}`}
                >
                  <button className="block w-full text-left" onClick={() => setSelectedItemId(item.id)}>
                    <div className={`relative overflow-hidden bg-slate-100 ${index % 5 === 0 ? 'aspect-[16/9]' : 'aspect-square'}`}>
                      {cover?.type === 'photo' ? (
                        <img src={cover.url} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : null}
                      {cover?.type === 'video' ? (
                        <video src={cover.url} muted className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : null}
                      {!cover ? (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <ImageIcon size={34} />
                        </div>
                      ) : null}

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <AdminTag tone={cover?.type === 'video' ? 'amber' : 'blue'}>
                          {cover?.type === 'video' ? 'Video' : 'Foto'}
                        </AdminTag>
                        {item.media?.length > 1 ? <AdminTag tone="slate">{item.media.length} file</AdminTag> : null}
                      </div>

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent px-4 pb-4 pt-8 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-slate-700">
                            <Edit size={16} />
                          </span>
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/90 text-slate-700">
                            <Trash2 size={16} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="space-y-4 p-4">
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-slate-900">{item.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{item.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(item.tags || []).slice(0, 3).map((tagName) => (
                        <AdminTag key={tagName} tone="emerald">{tagName}</AdminTag>
                      ))}
                      {(item.tags?.length || 0) > 3 ? <AdminTag tone="slate">+{item.tags.length - 3}</AdminTag> : null}
                    </div>

                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                      <AdminSecondaryButton className="flex-1 py-2" onClick={() => openEditModal(item)}>
                        <Edit size={14} />
                        Edit
                      </AdminSecondaryButton>
                      <AdminSecondaryButton className="flex-1 py-2 text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" onClick={() => setConfirmDeleteId(item.id)}>
                        <Trash2 size={14} />
                        Hapus
                      </AdminSecondaryButton>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {!filteredItems.length ? (
            <div className="mt-5">
              <AdminEmptyState
                icon={LayoutGrid}
                title={search || activeFilter !== 'Semua' ? 'Media tidak ditemukan' : 'Belum ada dokumentasi'}
                description={search || activeFilter !== 'Semua'
                  ? 'Coba ubah kata kunci pencarian atau pilih filter lain.'
                  : 'Unggah foto dan video pertama untuk mulai membangun dokumentasi lembaga.'}
                action={!search && activeFilter === 'Semua' ? (
                  <AdminPrimaryButton onClick={openCreateModal}>
                    <Plus size={18} />
                    Upload Media
                  </AdminPrimaryButton>
                ) : null}
              />
            </div>
          ) : null}
        </AdminSurface>

        <div className="space-y-6 lg:space-y-7">
          <AdminInfoPanel>
            <AdminPanelTitle
              title="Detail Koleksi"
              description="Ringkasan item terpilih beserta metadata dan aksi cepat."
            />

            {selectedItem ? (
              <div className="mt-5 space-y-5">
                <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50/70">
                  {getCover(selectedItem)?.type === 'photo' ? (
                    <img src={getCover(selectedItem).url} alt={selectedItem.title} className="aspect-[16/11] w-full object-cover" />
                  ) : null}
                  {getCover(selectedItem)?.type === 'video' ? (
                    <video src={getCover(selectedItem).url} controls className="aspect-[16/11] w-full object-cover" />
                  ) : null}
                  {!getCover(selectedItem) ? (
                    <div className="flex aspect-[16/11] items-center justify-center text-slate-300">
                      <ImageIcon size={30} />
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="flex flex-wrap gap-2">
                    <AdminTag tone="emerald">{selectedItem.type === 'video' ? 'Video' : 'Foto'}</AdminTag>
                    <AdminTag tone="slate">{selectedItem.media?.length || 0} file</AdminTag>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{selectedItem.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{selectedItem.description}</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700">Tag Kategori</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(selectedItem.tags || []).map((tagName) => (
                      <AdminTag key={tagName} tone="blue">{tagName}</AdminTag>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-700">Asset di dalam koleksi</p>
                  <div className="mt-3 space-y-2">
                    {(selectedItem.media || []).map((media) => (
                      <div key={media.id} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">
                        <span className="truncate pr-3">{media.name}</span>
                        <AdminTag tone={media.type === 'video' ? 'amber' : 'slate'}>{media.type === 'video' ? 'Video' : 'Foto'}</AdminTag>
                      </div>
                    ))}
                    {selectedItem.media?.length === 0 ? (
                      <p className="text-sm text-slate-500">Item ini belum memiliki daftar asset tambahan.</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-3">
                  <AdminSecondaryButton className="flex-1" onClick={() => openEditModal(selectedItem)}>
                    <Edit size={16} />
                    Edit
                  </AdminSecondaryButton>
                  <AdminSecondaryButton className="flex-1 text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" onClick={() => setConfirmDeleteId(selectedItem.id)}>
                    <Trash2 size={16} />
                    Hapus
                  </AdminSecondaryButton>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <AdminEmptyState
                  icon={ImageIcon}
                  title="Belum ada item terpilih"
                  description="Klik salah satu kartu media di kiri untuk melihat detail koleksi dan aksi cepat."
                />
              </div>
            )}
          </AdminInfoPanel>

          <AdminInfoPanel>
            <AdminPanelTitle
              title="Tag Organizer"
              description="Rapikan label dokumentasi agar pencarian dan pengelompokan lebih cepat."
            />

            <div className="mt-5 flex gap-2">
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                }}
                className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition-colors focus:border-emerald-300"
                placeholder="Buat tag baru..."
              />
              <AdminPrimaryButton className="h-11 px-4" onClick={addTag}>
                <Plus size={16} />
              </AdminPrimaryButton>
            </div>

            <div className="mt-4 flex max-h-[260px] flex-wrap gap-2 overflow-y-auto pr-1">
              {availableTags.map((tagName, index) => {
                const isEditing = editingTagIndex === index;

                return (
                  <div key={`${tagName}-${index}`} className="inline-flex items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-600 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)]">
                    {isEditing ? (
                      <div className="flex items-center gap-2 p-2">
                        <input
                          value={editingTagValue}
                          onChange={(event) => setEditingTagValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              saveEditedTag();
                            }
                          }}
                          className="h-8 w-24 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-300"
                          autoFocus
                        />
                        <button type="button" className="text-emerald-600" onClick={saveEditedTag} aria-label="Simpan tag">
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="px-3 py-2 font-medium">{tagName}</span>
                        <div className="flex items-center border-l border-slate-100 px-2">
                          <button type="button" className="rounded-xl p-1 text-slate-400 transition-colors hover:text-blue-600" onClick={() => startEditTag(index, tagName)} aria-label="Edit tag">
                            <Edit size={12} />
                          </button>
                          <button type="button" className="rounded-xl p-1 text-slate-400 transition-colors hover:text-rose-600" onClick={() => deleteTag(tagName)} aria-label="Hapus tag">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </AdminInfoPanel>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[#f5f8f6] shadow-[0_32px_90px_-32px_rgba(15,23,42,0.45)]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">{editingId ? 'Edit koleksi' : 'Upload koleksi'}</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                  {editingId ? 'Perbarui item dokumentasi' : 'Tambahkan dokumentasi baru'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <AdminSecondaryButton className="hidden sm:inline-flex" onClick={closeModal}>
                  Batal
                </AdminSecondaryButton>
                <button className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:text-slate-600" onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row">
              <div className="w-full border-b border-slate-100 p-5 lg:w-[44%] lg:border-b-0 lg:border-r lg:p-6">
                <form id="gallery-form" onSubmit={handleSubmit} className="space-y-6">
                  {formError ? (
                    <div className="flex items-start gap-2 rounded-[22px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  ) : null}

                  <AdminField label="Judul Galeri" helper="Wajib diisi">
                    <input
                      id="gallery-title"
                      value={form.title}
                      onChange={(event) => handleChange('title', event.target.value)}
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition-colors focus:border-emerald-300"
                      placeholder="Contoh: Kegiatan Kursus Microsoft Word"
                      required
                    />
                  </AdminField>

                  <AdminField label="Deskripsi Galeri" helper="Wajib diisi">
                    <textarea
                      id="gallery-description"
                      value={form.description}
                      onChange={(event) => handleChange('description', event.target.value)}
                      className="min-h-[130px] w-full rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-300"
                      placeholder="Tuliskan konteks kegiatan, suasana, atau tujuan dokumentasi."
                      required
                    />
                  </AdminField>

                  <div className="rounded-[24px] border border-slate-100 bg-white p-4">
                    <AdminPanelTitle title="Tag Kategori" description="Pilih tag yang paling relevan untuk item ini." />

                    <div className="mt-4 flex gap-2">
                      <input
                        value={tagDraft}
                        onChange={(event) => setTagDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            addTag();
                          }
                        }}
                        className="h-11 flex-1 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition-colors focus:border-emerald-300"
                        placeholder="Buat tag baru..."
                      />
                      <AdminPrimaryButton className="h-11 px-4" onClick={addTag}>
                        <Plus size={16} />
                      </AdminPrimaryButton>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {availableTags.map((tagName, index) => {
                        const selected = form.tags.includes(tagName);
                        const isEditing = editingTagIndex === index;

                        return (
                          <div key={`${tagName}-${index}`} className={`inline-flex items-center rounded-2xl border text-sm transition-colors ${selected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                            {isEditing ? (
                              <div className="flex items-center gap-2 p-2">
                                <input
                                  value={editingTagValue}
                                  onChange={(event) => setEditingTagValue(event.target.value)}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      saveEditedTag();
                                    }
                                  }}
                                  className="h-8 w-24 rounded-xl border border-slate-200 px-2 text-xs text-slate-800 outline-none focus:border-emerald-300"
                                  autoFocus
                                />
                                <button type="button" className="text-emerald-600" onClick={saveEditedTag} aria-label="Simpan tag">
                                  <Check size={14} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button type="button" className="flex items-center gap-1.5 px-3 py-2 font-medium" onClick={() => handleTagToggle(tagName)}>
                                  <Tag size={12} />
                                  {tagName}
                                </button>
                                <div className={`flex items-center border-l px-1 ${selected ? 'border-white/20 text-white/80' : 'border-slate-100 text-slate-400'}`}>
                                  <button type="button" className="rounded-lg p-1 transition-colors hover:text-inherit" onClick={() => startEditTag(index, tagName)} aria-label="Edit tag">
                                    <Edit size={12} />
                                  </button>
                                  <button type="button" className="rounded-lg p-1 transition-colors hover:text-inherit" onClick={() => deleteTag(tagName)} aria-label="Hapus tag">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </form>
              </div>

              <div className="flex min-h-0 flex-1 flex-col bg-slate-50/70 p-5 lg:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-slate-900">Asset Manager</h3>
                    <p className="mt-1 text-sm text-slate-500">Unggah beberapa foto atau video, lalu susun koleksi sebelum disimpan.</p>
                  </div>
                  <AdminTag tone="slate">{form.media.length} file</AdminTag>
                </div>

                <label className="mt-5 flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-emerald-200 bg-emerald-50/65 px-6 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-emerald-600 shadow-[0_16px_34px_-22px_rgba(5,150,105,0.35)]">
                    <Upload size={24} />
                  </div>
                  <p className="mt-4 text-base font-semibold text-slate-800">Tarik file ke sini atau klik untuk memilih</p>
                  <p className="mt-1 text-sm text-slate-500">Mendukung beberapa foto dan video sekaligus.</p>
                  <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleFilesChange} />
                </label>

                {form.media.length > 0 ? (
                  <div className="mt-5 grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                    {form.media.map((media) => (
                      <div key={media.id} className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_45px_-32px_rgba(15,23,42,0.22)]">
                        <div className="relative aspect-square overflow-hidden bg-slate-100">
                          {media.type === 'video' ? (
                            <video src={media.url} className="h-full w-full object-cover" />
                          ) : (
                            <img src={media.url} alt={media.name} className="h-full w-full object-cover" />
                          )}
                          <div className="absolute left-2 top-2">
                            <AdminTag tone={media.type === 'video' ? 'amber' : 'blue'}>
                              {media.type === 'video' ? 'Video' : 'Foto'}
                            </AdminTag>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => removeMedia(media.id)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-rose-600 shadow-lg transition-transform hover:scale-105"
                              aria-label="Hapus file"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="border-t border-slate-100 px-3 py-2">
                          <p className="truncate text-xs font-medium text-slate-600" title={media.name}>{media.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white/70 px-6 text-center">
                    <ImageIcon size={42} className="text-slate-300" />
                    <p className="mt-4 text-base font-semibold text-slate-700">Belum ada asset terunggah</p>
                    <p className="mt-1 text-sm text-slate-500">Upload media untuk melihat antrean preview di area ini.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
              <p className="text-sm text-slate-500">Periksa kembali deskripsi, tag, dan file sebelum menyimpan koleksi.</p>
              <AdminPrimaryButton type="submit" form="gallery-form">
                <Save size={16} />
                {editingId ? 'Simpan Perubahan' : 'Simpan Galeri'}
              </AdminPrimaryButton>
            </div>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Hapus item galeri"
        description="Media yang dihapus tidak lagi tampil di admin maupun halaman galeri publik."
        confirmLabel="Hapus media"
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
