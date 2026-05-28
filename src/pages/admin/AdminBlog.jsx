import { Suspense, lazy, useMemo, useState } from 'react';
import {
  Check,
  Edit,
  Eye,
  FileText,
  Image as ImageIcon,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { defaultCategories } from '../../data/mockData';
import {
  AdminEmptyState,
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
} from '../../components/admin/AdminUi';
import { useBlogPosts } from '../../utils/useBlogPosts';

const AdminBlogEditorModal = lazy(() => import('../../components/admin/AdminBlogEditorModal'));

const initialBlogTags = defaultCategories.map((category) => category.name);
const defaultCategory = defaultCategories[0]?.name || 'Edukasi';

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getReadingTime(content) {
  const wordCount = stripHtml(content).split(' ').filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 180));
}

function formatDateLabel(value) {
  if (!value) return '-';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function getPostTags(post) {
  if (post?.tags?.length) {
    return post.tags;
  }

  return post?.category ? [post.category] : [];
}

function AdminBlogEditorFallback({ isEditing, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-[30px] border border-white/70 bg-[#f5f8f6] shadow-[0_32px_90px_-32px_rgba(15,23,42,0.45)]">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              {isEditing ? 'Edit artikel' : 'Artikel baru'}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              Menyiapkan studio editorial...
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:text-slate-600"
            onClick={onClose}
            aria-label="Tutup editor"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center p-10">
          <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-500 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.28)]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            Memuat editor TipTap...
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminBlog() {
  const { posts, setPosts, error, reload } = useBlogPosts();
  const [managedTags, setManagedTags] = useState(initialBlogTags);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [search, setSearch] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  const filteredPosts = useMemo(() => posts.filter((post) => (
    post.title.toLowerCase().includes(search.toLowerCase()) ||
    post.category.toLowerCase().includes(search.toLowerCase()) ||
    getPostTags(post).some((tagName) => tagName.toLowerCase().includes(search.toLowerCase()))
  )), [posts, search]);

  const selectedPreviewPost = filteredPosts.find((post) => post.id === selectedPostId) || filteredPosts[0] || null;
  const totalWords = posts.reduce((count, post) => count + stripHtml(post.content || '').split(' ').filter(Boolean).length, 0);
  const availableTags = Array.from(new Set([
    ...managedTags,
    ...posts.flatMap((post) => getPostTags(post)).filter(Boolean),
  ]));

  const blogMetrics = [
    { label: 'Artikel Tersimpan', value: posts.length, hint: 'Konten aktif', icon: FileText, tone: 'emerald' },
    { label: 'Kategori Utama', value: new Set(posts.map((post) => post.category)).size, hint: 'Topik', icon: Tag, tone: 'blue' },
    { label: 'Tag Tersedia', value: availableTags.length, hint: 'Organisasi', icon: Search, tone: 'amber' },
    { label: 'Total Kata', value: totalWords.toLocaleString('id-ID'), hint: 'Editorial', icon: Eye, tone: 'slate' },
  ];

  const resetTagEditor = () => {
    setTagDraft('');
    setEditingTagIndex(null);
    setEditingTagValue('');
  };

  const openCreateModal = () => {
    setEditingPost(null);
    resetTagEditor();
    setShowModal(true);
  };

  const openEdit = (post) => {
    setEditingPost(post);
    setSelectedPostId(post.id);
    resetTagEditor();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPost(null);
  };

  const addAvailableTag = (value) => {
    const nextTag = value.trim();
    if (!nextTag) {
      return null;
    }

    setManagedTags((current) => (
      current.includes(nextTag) ? current : [...current, nextTag]
    ));

    return nextTag;
  };

  const renameAvailableTag = (index, previousTag, value) => {
    const nextTag = value.trim();
    if (!nextTag || index === null) {
      return null;
    }

    setManagedTags((current) => (
      current.map((tagName, tagIndex) => (tagIndex === index ? nextTag : tagName))
    ));

    setPosts((current) => (
      current.map((post) => ({
        ...post,
        tags: getPostTags(post).map((tagName) => (tagName === previousTag ? nextTag : tagName)),
        category: post.category === previousTag ? nextTag : post.category,
      }))
    ));

    return nextTag;
  };

  const deleteAvailableTag = (tagName) => {
    setManagedTags((current) => current.filter((tag) => tag !== tagName));

    setPosts((current) => (
      current.map((post) => ({
        ...post,
        tags: getPostTags(post).filter((tag) => tag !== tagName),
        category: post.category === tagName
          ? getPostTags(post).find((tag) => tag !== tagName) || defaultCategory
          : post.category,
      }))
    ));
  };

  const addTag = () => {
    const nextTag = addAvailableTag(tagDraft);
    if (!nextTag) {
      return;
    }

    setTagDraft('');
  };

  const startEditTag = (index, tagName) => {
    setEditingTagIndex(index);
    setEditingTagValue(tagName);
  };

  const saveEditedTag = () => {
    const previousTag = availableTags[editingTagIndex];
    const nextTag = renameAvailableTag(editingTagIndex, previousTag, editingTagValue);
    if (!nextTag) {
      return;
    }

    setEditingTagIndex(null);
    setEditingTagValue('');
  };

  const handleDelete = (id) => {
    if (!confirm('Hapus artikel ini?')) {
      return;
    }

    setPosts((current) => current.filter((post) => post.id !== id));
    setSelectedPostId((current) => (current === id ? null : current));
  };

  const handleSavePost = async (draftPost) => {
    const nextPost = {
      id: editingPost?.id || Date.now(),
      title: draftPost.title.trim(),
      slug: draftPost.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      category: draftPost.tags[0] || draftPost.category,
      summary: draftPost.summary,
      content: draftPost.content,
      author: draftPost.author,
      status: 'published',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      image: draftPost.image,
      tags: draftPost.tags,
    };

    if (editingPost?.id) {
      setPosts((current) => current.map((post) => (post.id === editingPost.id ? nextPost : post)));
    } else {
      setPosts((current) => [nextPost, ...current]);
    }

    setSelectedPostId(nextPost.id);
    closeModal();
  };

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      {error ? (
        <AdminNotice
          tone="rose"
          title="Data blog gagal dimuat"
          description={error}
          action={<AdminSecondaryButton onClick={reload}>Coba lagi</AdminSecondaryButton>}
        />
      ) : null}

      <AdminHero
        icon={FileText}
        title="Manajemen Blog"
        description="Kelola artikel, taksonomi konten, dan kualitas editorial dari satu workspace yang lebih rapi dan terarah."
        actions={(
          <>
            <AdminSearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari artikel, kategori, atau tag..."
            />
            <AdminPrimaryButton onClick={openCreateModal}>
              <Plus size={18} />
              Tulis Artikel
            </AdminPrimaryButton>
          </>
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5 xl:grid-cols-4">
          {blogMetrics.map((metric) => (
            <AdminMetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </AdminHero>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:gap-7 2xl:gap-8">
        <AdminSurface className="overflow-hidden p-5 sm:p-6 lg:p-7">
          <AdminPanelTitle
            title="Ruang Editorial"
            description="Daftar artikel aktif dengan metadata, kategori, tag, dan aksi cepat."
          />

          <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-100">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full border-separate border-spacing-0">
                <thead className="bg-slate-50/90">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">No</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Artikel</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Kategori</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Ringkasan</th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tanggal</th>
                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredPosts.map((post, index) => {
                    const isSelected = selectedPreviewPost?.id === post.id;
                    const secondaryTags = getPostTags(post).filter((tagName) => tagName !== post.category);

                    return (
                      <tr
                        key={post.id}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50/45' : 'hover:bg-emerald-50/30'}`}
                        onClick={() => setSelectedPostId(post.id)}
                      >
                        <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">{index + 1}</td>
                        <td className="border-t border-slate-100 px-5 py-4">
                          <div className="flex items-start gap-3">
                            {post.image ? (
                              <img src={post.image} alt={post.title} className="h-14 w-16 rounded-2xl object-cover shadow-[0_10px_25px_-18px_rgba(15,23,42,0.5)]" />
                            ) : (
                              <div className="flex h-14 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-300">
                                <ImageIcon size={18} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{post.title}</p>
                              <p className="mt-1 text-xs text-slate-500">Oleh {post.author}</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <AdminTag tone="blue">{post.category}</AdminTag>
                                {secondaryTags.slice(0, 2).map((tagName) => (
                                  <AdminTag key={tagName}>{tagName}</AdminTag>
                                ))}
                                {secondaryTags.length > 2 ? <AdminTag>+{secondaryTags.length - 2}</AdminTag> : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600">{post.category}</td>
                        <td className="border-t border-slate-100 px-5 py-4">
                          <p className="max-w-[280px] text-sm leading-6 text-slate-500 line-clamp-2">
                            {post.summary || 'Ringkasan artikel belum ditambahkan.'}
                          </p>
                        </td>
                        <td className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600">{formatDateLabel(post.publishedAt || post.updatedAt || post.createdAt)}</td>
                        <td className="border-t border-slate-100 px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedPostId(post.id);
                              }}
                              title="Pilih artikel"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEdit(post);
                              }}
                              title="Edit artikel"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDelete(post.id);
                              }}
                              title="Hapus artikel"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPosts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="border-t border-slate-100 px-5 py-8">
                        <AdminEmptyState
                          icon={FileText}
                          title={search ? 'Artikel tidak ditemukan' : 'Belum ada artikel'}
                          description={search ? 'Ubah kata kunci pencarian atau tambahkan artikel baru.' : 'Mulai bangun kanal blog dengan artikel pertama Anda.'}
                          action={!search ? (
                            <AdminPrimaryButton onClick={openCreateModal}>
                              <Plus size={18} />
                              Tambah Artikel
                            </AdminPrimaryButton>
                          ) : null}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </AdminSurface>

        <div className="space-y-6 lg:space-y-7">
          <AdminInfoPanel>
            <AdminPanelTitle
              title="Panel Artikel"
              description="Preview cepat dan metadata dari artikel yang sedang dipilih."
            />

            {selectedPreviewPost ? (
              <div className="mt-5 space-y-5">
                <div className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50/70">
                  {selectedPreviewPost.image ? (
                    <img src={selectedPreviewPost.image} alt={selectedPreviewPost.title} className="aspect-[16/10] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center text-slate-300">
                      <ImageIcon size={30} />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap gap-2">
                    <AdminTag tone="emerald">Terbit</AdminTag>
                    <AdminTag tone="blue">{selectedPreviewPost.category}</AdminTag>
                    <AdminTag tone="slate">{getReadingTime(selectedPreviewPost.content || '')} menit baca</AdminTag>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">{selectedPreviewPost.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {selectedPreviewPost.summary || 'Ringkasan artikel belum ditambahkan.'}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-400">Penulis</dt>
                    <dd className="mt-1 font-semibold text-slate-800">{selectedPreviewPost.author}</dd>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <dt className="text-slate-400">Tanggal</dt>
                    <dd className="mt-1 font-semibold text-slate-800">{formatDateLabel(selectedPreviewPost.date)}</dd>
                  </div>
                </dl>

                <div>
                  <p className="text-sm font-semibold text-slate-700">Tag Artikel</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {getPostTags(selectedPreviewPost).map((tagName) => (
                      <AdminTag key={tagName} tone={tagName === selectedPreviewPost.category ? 'blue' : 'slate'}>
                        {tagName}
                      </AdminTag>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <AdminSecondaryButton className="flex-1" onClick={() => openEdit(selectedPreviewPost)}>
                    <Edit size={16} />
                    Edit
                  </AdminSecondaryButton>
                  <AdminSecondaryButton className="flex-1 text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleDelete(selectedPreviewPost.id)}>
                    <Trash2 size={16} />
                    Hapus
                  </AdminSecondaryButton>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <AdminEmptyState
                  icon={Eye}
                  title="Tidak ada preview"
                  description="Pilih salah satu artikel dari tabel untuk melihat ringkasan dan metadata di sisi kanan."
                />
              </div>
            )}
          </AdminInfoPanel>

          <AdminInfoPanel>
            <AdminPanelTitle
              title="Studio Tag"
              description="Tambah, edit, dan rapikan tag editorial tanpa meninggalkan halaman."
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
                className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-colors focus:border-emerald-300"
                placeholder="Tambahkan tag baru..."
              />
              <AdminPrimaryButton className="h-11 px-4" onClick={addTag}>
                <Plus size={16} />
              </AdminPrimaryButton>
            </div>

            <div className="mt-4 flex max-h-[290px] flex-wrap gap-2 overflow-y-auto pr-1">
              {availableTags.map((tagName, index) => {
                const isEditing = editingTagIndex === index;

                return (
                  <div key={`${tagName}-${index}`} className="flex items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-600 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)]">
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
                          className="h-8 w-28 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-300"
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
                          <button type="button" className="rounded-xl p-1 text-slate-400 transition-colors hover:text-rose-600" onClick={() => deleteAvailableTag(tagName)} aria-label="Hapus tag">
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

      {showModal ? (
        <Suspense fallback={<AdminBlogEditorFallback isEditing={Boolean(editingPost?.id)} onClose={closeModal} />}>
          <AdminBlogEditorModal
            key={editingPost?.id || 'new'}
            availableTags={availableTags}
            defaultCategory={defaultCategory}
            initialPost={editingPost}
            onAddTag={addAvailableTag}
            onClose={closeModal}
            onDeleteTag={deleteAvailableTag}
            onRenameTag={renameAvailableTag}
            onSave={handleSavePost}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
