import { useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Edit,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Plus,
  Redo,
  Save,
  Tag,
  Trash2,
  Undo,
  Upload,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import TipTapLink from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import {
  AdminField,
  AdminPanelTitle,
  AdminPrimaryButton,
  AdminSecondaryButton,
  AdminStickyBar,
} from './AdminUi';

function createFormValues(post, defaultCategory) {
  const tags = post?.tags?.length ? post.tags : post?.category ? [post.category] : [];

  return {
    title: post?.title || '',
    category: post?.category || defaultCategory,
    summary: post?.summary || '',
    content: post?.content || '',
    author: post?.author || 'Admin LKP',
    image: null,
    tags,
  };
}

export default function AdminBlogEditorModal({
  availableTags,
  defaultCategory,
  initialPost,
  onAddTag,
  onClose,
  onDeleteTag,
  onRenameTag,
  onSave,
}) {
  const initialValues = createFormValues(initialPost, defaultCategory);
  const [imagePreview, setImagePreview] = useState(initialPost?.image || '');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [tagDraft, setTagDraft] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState(null);
  const [editingTagValue, setEditingTagValue] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors: formErrors },
    watch,
  } = useForm({
    defaultValues: initialValues,
  });

  const selectedTags = watch('tags') || [];

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TipTapLink.configure({ openOnClick: false }),
      TextStyle,
      Color,
    ],
    content: initialValues.content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none px-5 py-4 text-slate-700 focus:outline-none min-h-[380px] sm:prose-base',
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      setValue('content', nextEditor.getHTML(), { shouldDirty: true });
    },
  });

  const isEditing = Boolean(initialPost?.id);

  const handleTagToggle = (tagName) => {
    const nextTags = selectedTags.includes(tagName)
      ? selectedTags.filter((tag) => tag !== tagName)
      : [...selectedTags, tagName];

    setValue('tags', nextTags, { shouldDirty: true });
    if (nextTags[0]) {
      setValue('category', nextTags[0], { shouldDirty: true });
    }
  };

  const addTag = () => {
    const nextTag = onAddTag(tagDraft);
    if (!nextTag) {
      return;
    }

    if (!selectedTags.includes(nextTag)) {
      const nextTags = [...selectedTags, nextTag];
      setValue('tags', nextTags, { shouldDirty: true });
      setValue('category', nextTags[0], { shouldDirty: true });
    }

    setTagDraft('');
  };

  const startEditTag = (index, tagName) => {
    setEditingTagIndex(index);
    setEditingTagValue(tagName);
  };

  const saveEditedTag = () => {
    const previousTag = availableTags[editingTagIndex];
    const nextTag = onRenameTag(editingTagIndex, previousTag, editingTagValue);
    if (!nextTag) {
      return;
    }

    const nextSelectedTags = selectedTags.map((tagName) => (
      tagName === previousTag ? nextTag : tagName
    ));
    setValue('tags', nextSelectedTags, { shouldDirty: true });
    if (nextSelectedTags[0]) {
      setValue('category', nextSelectedTags[0], { shouldDirty: true });
    }

    setEditingTagIndex(null);
    setEditingTagValue('');
  };

  const deleteTag = (tagName) => {
    onDeleteTag(tagName);

    const nextSelectedTags = selectedTags.filter((tag) => tag !== tagName);
    setValue('tags', nextSelectedTags, { shouldDirty: true });
    setValue('category', nextSelectedTags[0] || defaultCategory, { shouldDirty: true });
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (nextEvent) => setImagePreview(nextEvent.target?.result || '');
    reader.readAsDataURL(file);
    setValue('image', file, { shouldDirty: true });
  };

  const clearImage = () => {
    setImagePreview('');
    setValue('image', null, { shouldDirty: true });
  };

  const submitPost = async (data) => {
    setSubmitLoading(true);

    try {
      await onSave({
        ...data,
        title: data.title.trim(),
        category: selectedTags[0] || data.category,
        content: data.content || editor?.getHTML() || '',
        image: imagePreview || '',
        tags: selectedTags,
      });
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitLoading(false);
    }
  };

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
              {isEditing ? 'Perbarui artikel blog' : 'Tulis artikel untuk publikasi'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <AdminSecondaryButton className="hidden sm:inline-flex" onClick={onClose}>
              Batal
            </AdminSecondaryButton>
            <AdminPrimaryButton onClick={handleSubmit(submitPost)} disabled={submitLoading}>
              {submitLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Save size={16} />
                  Simpan Artikel
                </>
              )}
            </AdminPrimaryButton>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:text-slate-600"
              onClick={onClose}
              aria-label="Tutup editor"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 lg:flex-row lg:p-6">
          <div className="min-w-0 flex-1">
            <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_20px_55px_-36px_rgba(15,23,42,0.28)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <input
                  id="blog-title"
                  {...register('title', { required: 'Judul artikel wajib diisi.' })}
                  placeholder="Tuliskan judul artikel yang kuat dan jelas..."
                  className="w-full border-none bg-transparent text-[1.8rem] font-semibold leading-tight tracking-tight text-slate-900 outline-none placeholder:text-slate-300"
                />
                {formErrors.title ? <p className="mt-2 text-sm text-rose-600">{formErrors.title.message}</p> : null}
              </div>

              <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50/90 px-4 py-3 backdrop-blur">
                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-30"
                  onClick={() => editor?.chain().focus().undo().run()}
                  disabled={!editor?.can().undo()}
                  title="Undo"
                >
                  <Undo size={16} />
                </button>
                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-30"
                  onClick={() => editor?.chain().focus().redo().run()}
                  disabled={!editor?.can().redo()}
                  title="Redo"
                >
                  <Redo size={16} />
                </button>

                <div className="mx-1 h-5 w-px bg-slate-200" />

                <button
                  type="button"
                  className={`rounded-xl px-2 py-1.5 text-sm font-semibold ${editor?.isActive('heading', { level: 1 }) ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                  title="Heading 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-2 py-1.5 text-sm font-semibold ${editor?.isActive('heading', { level: 2 }) ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  type="button"
                  className={`rounded-xl px-2 py-1.5 text-sm font-semibold ${editor?.isActive('heading', { level: 3 }) ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  title="Heading 3"
                >
                  H3
                </button>

                <div className="mx-1 h-5 w-px bg-slate-200" />

                <button
                  type="button"
                  className={`rounded-xl p-2 ${editor?.isActive('bold') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  title="Bold"
                >
                  <Bold size={16} />
                </button>
                <button
                  type="button"
                  className={`rounded-xl p-2 ${editor?.isActive('italic') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  title="Italic"
                >
                  <Italic size={16} />
                </button>

                <div className="mx-1 h-5 w-px bg-slate-200" />

                <button
                  type="button"
                  className={`rounded-xl p-2 ${editor?.isActive({ textAlign: 'left' }) ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                  title="Align Left"
                >
                  <AlignLeft size={16} />
                </button>
                <button
                  type="button"
                  className={`rounded-xl p-2 ${editor?.isActive({ textAlign: 'center' }) ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                  title="Align Center"
                >
                  <AlignCenter size={16} />
                </button>
                <button
                  type="button"
                  className={`rounded-xl p-2 ${editor?.isActive({ textAlign: 'right' }) ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                  title="Align Right"
                >
                  <AlignRight size={16} />
                </button>
                <button
                  type="button"
                  className={`rounded-xl p-2 ${editor?.isActive({ textAlign: 'justify' }) ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                  title="Justify"
                >
                  <AlignJustify size={16} />
                </button>

                <div className="mx-1 h-5 w-px bg-slate-200" />

                <button
                  type="button"
                  className={`rounded-xl p-2 ${editor?.isActive('bulletList') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  title="Bullet List"
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  className={`rounded-xl p-2 ${editor?.isActive('orderedList') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  title="Numbered List"
                >
                  <ListOrdered size={16} />
                </button>
                <button
                  type="button"
                  className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-white"
                  onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                  title="Horizontal Line"
                >
                  <Minus size={16} />
                </button>
                <button
                  type="button"
                  className={`rounded-xl p-2 ${editor?.isActive('link') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-600 hover:bg-white'}`}
                  onClick={() => {
                    const url = prompt('Masukkan URL:');
                    if (url) {
                      editor?.chain().focus().setLink({ href: url }).run();
                    }
                  }}
                  title="Tambahkan link"
                >
                  <Link size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-white" onClick={() => editor?.commands.focus()}>
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 space-y-5 lg:w-[340px]">
            <div className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.28)]">
              <AdminField label="Cover Berita" helper="1200x630px">
                <label className="group flex aspect-[16/10] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30">
                  {imagePreview ? (
                    <div className="relative h-full w-full">
                      <img src={imagePreview} alt="Preview cover" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-700">Ganti cover</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center text-slate-400">
                      <Upload size={26} />
                      <p className="mt-3 text-sm font-semibold text-slate-700">Unggah gambar cover</p>
                      <p className="mt-1 text-xs">PNG atau JPG dengan komposisi landscape</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </AdminField>

              {imagePreview ? (
                <button type="button" onClick={clearImage} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-rose-600 transition-colors hover:text-rose-700">
                  <Trash2 size={14} />
                  Hapus gambar
                </button>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.28)]">
              <AdminPanelTitle
                title="Kategori & Tag"
                description="Atur kategori utama dan tag pendukung agar artikel mudah ditemukan."
              />

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

              <div className="mt-4 flex max-h-[240px] flex-wrap gap-2 overflow-y-auto pr-1">
                {availableTags.map((tagName, index) => {
                  const selected = selectedTags.includes(tagName);
                  const isTagEditing = editingTagIndex === index;

                  return (
                    <div key={`${tagName}-${index}`} className={`inline-flex items-center rounded-2xl border text-xs transition-colors ${selected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                      {isTagEditing ? (
                        <div className="flex items-center gap-1 p-2">
                          <input
                            value={editingTagValue}
                            onChange={(event) => setEditingTagValue(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                saveEditedTag();
                              }
                            }}
                            className="h-8 w-20 rounded-xl border border-slate-200 px-2 text-[11px] outline-none focus:border-emerald-300"
                            autoFocus
                          />
                          <button type="button" className="text-emerald-600" onClick={saveEditedTag} aria-label="Simpan tag">
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button type="button" className="flex items-center gap-1.5 px-3 py-2 font-semibold" onClick={() => handleTagToggle(tagName)}>
                            <Tag size={11} />
                            {tagName}
                          </button>
                          <div className="flex items-center border-l border-slate-100 px-1.5">
                            <button type="button" className="rounded-lg p-1 text-slate-400 transition-colors hover:text-blue-600" onClick={() => startEditTag(index, tagName)} aria-label="Edit tag">
                              <Edit size={11} />
                            </button>
                            <button type="button" className="rounded-lg p-1 text-slate-400 transition-colors hover:text-rose-600" onClick={() => deleteTag(tagName)} aria-label="Hapus tag">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_20px_55px_-36px_rgba(15,23,42,0.28)]">
              <div className="space-y-4">
                <AdminField label="Penulis">
                  <input
                    {...register('author')}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition-colors focus:border-emerald-300 focus:bg-white"
                    placeholder="Nama penulis"
                  />
                </AdminField>

                <AdminField label="Ringkasan Singkat" helper="Untuk preview dan SEO">
                  <textarea
                    {...register('summary')}
                    className="min-h-[110px] w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-emerald-300 focus:bg-white"
                    placeholder="Tuliskan ringkasan artikel..."
                  />
                </AdminField>
              </div>
            </div>

            <AdminStickyBar>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Status draft</p>
                  <p className="mt-1 text-xs text-slate-500">Pastikan judul, tag, cover, dan ringkasan sudah lengkap.</p>
                </div>
                <AdminPrimaryButton onClick={handleSubmit(submitPost)} disabled={submitLoading}>
                  <Save size={16} />
                  Simpan
                </AdminPrimaryButton>
              </div>
            </AdminStickyBar>
          </div>
        </div>
      </div>
    </div>
  );
}
