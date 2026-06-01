import { useEffect, useState } from 'react';
import { Facebook, Instagram, Save, Share2, Twitter, Youtube } from 'lucide-react';
import { useSocialLinks } from '../../hooks/admin/useSocialLinks';
import {
  AdminField,
  AdminHero,
  AdminInput,
  AdminNotice,
  AdminPrimaryButton,
  AdminSectionCard,
  AdminSidebarPanel,
  AdminTag,
  AdminTogglePill,
  AdminToast,
  AdminSecondaryButton,
} from '../../components/admin/AdminUi';

const socialFields = [
  {
    key: 'facebook',
    label: 'Halaman Facebook',
    placeholder: 'https://facebook.com/...',
    icon: Facebook,
    tone: 'blue',
    optional: false,
  },
  {
    key: 'instagram',
    label: 'Profil Instagram',
    placeholder: 'https://instagram.com/...',
    icon: Instagram,
    tone: 'rose',
    optional: false,
  },
  {
    key: 'youtube',
    label: 'Channel YouTube',
    placeholder: 'https://youtube.com/...',
    icon: Youtube,
    tone: 'rose',
    optional: true,
  },
  {
    key: 'twitter',
    label: 'Twitter / X',
    placeholder: 'https://twitter.com/...',
    icon: Twitter,
    tone: 'blue',
    optional: true,
  },
];

const iconToneMap = {
  blue: 'bg-blue-50 text-blue-600',
  rose: 'bg-rose-50 text-rose-600',
};

const requiredCount = socialFields.filter((field) => !field.optional).length;
const optionalCount = socialFields.length - requiredCount;

function createSocialMediaFormState(socialLinks) {
  return socialFields.reduce((result, field) => ({
    ...result,
    [field.key]: {
      url: '',
      enabled: false,
      ...(socialLinks[field.key] || {}),
    },
  }), {});
}

export default function AdminSosialMedia() {
  const { socialLinks, setSocialLinks, error, reload } = useSocialLinks();
  const [form, setForm] = useState(() => createSocialMediaFormState(socialLinks));
  const [toast, setToast] = useState({ title: '', description: '', tone: 'emerald' });

  useEffect(() => {
    setForm(createSocialMediaFormState(socialLinks));
  }, [socialLinks]);

  const filledCount = socialFields.filter((field) => String(form[field.key]?.url || '').trim()).length;

  const handleSubmit = (event) => {
    event.preventDefault();
    setSocialLinks(form);
    setToast({
      tone: 'emerald',
      title: 'Sosial media diperbarui',
      description: 'Navbar dan footer sekarang memakai tautan yang baru disimpan.',
    });
  };

  const updateSocialField = (fieldKey, value) => {
    setForm((current) => ({
      ...current,
      [fieldKey]: {
        ...(current[fieldKey] || { enabled: false, url: '' }),
        url: value,
        enabled: Boolean(value.trim()),
      },
    }));
  };

  const toggleSocialField = (fieldKey) => {
    setForm((current) => ({
      ...current,
      [fieldKey]: {
        ...(current[fieldKey] || { url: '' }),
        enabled: !current[fieldKey]?.enabled,
      },
    }));
  };

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      {error ? (
        <AdminNotice
          tone="rose"
          title="Tautan sosial media gagal dimuat"
          description={error}
          action={<AdminSecondaryButton onClick={reload}>Coba lagi</AdminSecondaryButton>}
        />
      ) : null}

      <AdminHero
        icon={Share2}
        title="Manajemen Sosial Media"
        description="Kelola tautan akun sosial media resmi yang ditampilkan di website dengan spacing form yang lebih konsisten."
        actions={(
          <AdminPrimaryButton form="social-media-form" type="submit">
            <Save size={18} />
            Simpan Perubahan
          </AdminPrimaryButton>
        )}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-5">
          <div className="rounded-2xl border border-emerald-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">Tautan Terisi</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{filledCount}</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700/70">Wajib</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{requiredCount}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white/78 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/70">Opsional</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{optionalCount}</p>
          </div>
        </div>
      </AdminHero>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] xl:gap-7 2xl:gap-8">
        <div className="space-y-6 lg:space-y-7">
          <AdminSectionCard
            title="Tautan Profil Publik"
            description="Masukkan URL lengkap agar link publik mudah divalidasi."
            action={<AdminTag tone="emerald">{filledCount}/{socialFields.length} terisi</AdminTag>}
            headerClassName="border-b border-slate-100 bg-slate-50/65 px-5 py-5 sm:px-6 lg:px-7"
            bodyClassName="p-5 sm:p-6 lg:p-7"
          >
            <form id="social-media-form" onSubmit={handleSubmit} className="space-y-6">
              {socialFields.map((field) => {
                const Icon = field.icon;

                return (
                  <AdminField
                    key={field.key}
                    label={field.label}
                    helper={field.optional ? 'Opsional' : 'Disarankan'}
                  >
                    <div className="group flex items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 transition-colors focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-100">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconToneMap[field.tone]}`}>
                        <Icon size={20} />
                      </div>
                      <AdminInput
                        className="h-11 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        value={form[field.key]?.url || ''}
                        onChange={(event) => updateSocialField(field.key, event.target.value)}
                        placeholder={field.placeholder}
                      />
                      <AdminTogglePill
                        pressed={Boolean(form[field.key]?.enabled)}
                        onClick={() => toggleSocialField(field.key)}
                      />
                    </div>
                  </AdminField>
                );
              })}

              <div className="flex justify-end border-t border-slate-100 pt-6">
                <AdminPrimaryButton type="submit">
                  <Save size={18} />
                  Simpan Perubahan
                </AdminPrimaryButton>
              </div>
            </form>
          </AdminSectionCard>
        </div>

        <AdminSidebarPanel
          title="Preview Status"
          description="Gunakan panel ini untuk melihat cepat tautan mana yang sudah siap dipublikasikan."
          className="xl:sticky xl:top-8 xl:self-start"
          contentClassName="space-y-3"
        >
            {socialFields.map((field) => {
              const Icon = field.icon;
              const value = String(form[field.key]?.url || '').trim();
              const enabled = Boolean(form[field.key]?.enabled);

              return (
                <div key={field.key} className="flex items-center justify-between gap-3 rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconToneMap[field.tone]}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{field.label}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{value || 'Belum diisi'}</p>
                    </div>
                  </div>
                  <AdminTag tone={value && enabled ? 'emerald' : 'slate'}>{value && enabled ? 'Aktif' : 'Kosong'}</AdminTag>
                </div>
              );
            })}
        </AdminSidebarPanel>
      </div>

      <AdminToast
        tone={toast.tone}
        title={toast.title}
        description={toast.description}
        onClose={() => setToast({ title: '', description: '', tone: 'emerald' })}
      />
    </div>
  );
}
