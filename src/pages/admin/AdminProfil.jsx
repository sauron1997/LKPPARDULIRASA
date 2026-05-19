import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Target,
  Upload,
} from 'lucide-react';
import { useProfile } from '../../hooks/admin/useProfile';
import {
  AdminField,
  AdminHero,
  AdminInput,
  AdminNotice,
  AdminPrimaryButton,
  AdminSectionCard,
  AdminSecondaryButton,
  AdminSidebarPanel,
  AdminStickyBar,
  AdminTag,
  AdminTextarea,
  AdminToast,
} from '../../components/admin/AdminUi';

function getCompletionPercentage(form) {
  const fields = [
    form.name,
    form.tagline,
    form.description,
    form.history,
    form.vision,
    form.mission,
    form.address,
    form.phone,
    form.email,
    form.socialMedia?.facebook?.url,
    form.socialMedia?.instagram?.url,
  ];

  const completed = fields.filter((field) => String(field || '').trim()).length;
  return Math.round((completed / fields.length) * 100);
}

function createProfileFormState(profile) {
  const socialMedia = profile.socialMedia || {};

  return {
    ...profile,
    mission: Array.isArray(profile.mission) ? profile.mission.join('\n') : '',
    logo: profile.logo || '',
    logoName: '',
    socialMedia: {
      ...socialMedia,
      facebook: { url: '', enabled: false, ...(socialMedia.facebook || {}) },
      instagram: { url: '', enabled: false, ...(socialMedia.instagram || {}) },
      youtube: { url: '', enabled: false, ...(socialMedia.youtube || {}) },
      twitter: { url: '', enabled: false, ...(socialMedia.twitter || {}) },
    },
  };
}

export default function AdminProfil() {
  const { profile, setProfile, error, reload } = useProfile();
  const [form, setForm] = useState(() => createProfileFormState(profile));
  const [toast, setToast] = useState({ title: '', description: '', tone: 'emerald' });

  useEffect(() => {
    setForm(createProfileFormState(profile));
  }, [profile]);

  const completion = useMemo(() => getCompletionPercentage(form), [form]);
  const missionItems = form.mission.split('\n').map((item) => item.trim()).filter(Boolean);

  const handleSubmit = (event) => {
    event.preventDefault();
    setProfile((current) => ({
      ...current,
      ...form,
      mission: missionItems,
      updatedAt: new Date().toISOString(),
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setToast({
      tone: 'emerald',
      title: 'Profil berhasil disimpan',
      description: 'Perubahan profil sekarang menjadi source of truth untuk halaman publik.',
    });
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (nextEvent) => {
      setForm((current) => ({
        ...current,
        logo: nextEvent.target?.result || '',
        logoName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateSocial = (field, value) => {
    setForm((current) => ({
      ...current,
      socialMedia: {
        ...current.socialMedia,
        [field]: {
          ...(current.socialMedia?.[field] || { enabled: true }),
          url: value,
          enabled: Boolean(value.trim()),
        },
      },
    }));
  };

  return (
    <div className="animate-fade-in space-y-7 lg:space-y-8">
      {error ? (
        <AdminNotice
          tone="rose"
          title="Data profil gagal dimuat"
          description={error}
          action={<AdminSecondaryButton onClick={reload}>Coba lagi</AdminSecondaryButton>}
        />
      ) : null}

      <AdminHero
        icon={Building2}
        title="Profil Lembaga"
        description="Atur identitas publik, narasi lembaga, dan informasi kontak resmi dengan struktur yang lebih jelas dan mudah dipantau."
        actions={(
          <>
            <AdminSecondaryButton>
              <ShieldCheck size={16} />
              Status Profil
            </AdminSecondaryButton>
            <AdminPrimaryButton form="profile-form" type="submit">
              <Save size={16} />
              Simpan Perubahan
            </AdminPrimaryButton>
          </>
        )}
      >
        <div className="grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="rounded-[28px] border border-white/80 bg-white/[0.92] p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.26)]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)]">
                {form.logo ? (
                  <img src={form.logo} alt="Logo lembaga" className="h-full w-full object-contain p-3" />
                ) : (
                  <Building2 size={30} className="text-slate-300" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <AdminTag tone="emerald">Profil publik</AdminTag>
                  <AdminTag tone="blue">{completion}% lengkap</AdminTag>
                </div>
                <h2 className="mt-4 text-[1.8rem] font-semibold tracking-tight text-slate-950">{form.name || 'Nama lembaga'}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {form.tagline || 'Tambahkan tagline singkat untuk memperjelas positioning lembaga.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/[0.92] p-5 shadow-[0_18px_50px_-34px_rgba(15,23,42,0.26)]">
            <p className="text-sm font-semibold text-slate-700">Kelengkapan Konten</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Semakin lengkap data profil, semakin baik kualitas halaman publik dan informasi kontak resmi lembaga.
            </p>
          </div>
        </div>
      </AdminHero>

      <form id="profile-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:gap-7 2xl:gap-8">
        <div className="space-y-6 lg:space-y-7">
          <AdminSectionCard
            title="Informasi Dasar"
            description="Kelola nama lembaga, tagline, logo, dan deskripsi singkat yang tampil untuk publik."
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <AdminField label="Nama Lembaga">
                  <AdminInput
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                  />
                </AdminField>

                <AdminField label="Tagline">
                  <AdminInput
                    value={form.tagline}
                    onChange={(event) => updateField('tagline', event.target.value)}
                  />
                </AdminField>
              </div>

              <div className="rounded-[24px] border border-slate-100 bg-slate-50/65 p-5">
                <AdminField label="Logo Lembaga" helper="PNG atau JPG">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)]">
                      {form.logo ? (
                        <img src={form.logo} alt="Preview logo lembaga" className="h-full w-full object-contain p-3" />
                      ) : (
                        <Building2 size={28} className="text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_14px_35px_-26px_rgba(15,23,42,0.25)] transition-colors hover:border-emerald-200 hover:text-emerald-700">
                        <Upload size={16} />
                        Pilih file logo
                        <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                      </label>
                      <p className="mt-3 text-xs leading-6 text-slate-500">Rekomendasi ukuran 500x500px. Format yang didukung PNG dan JPG, maksimal 2MB.</p>
                      {form.logoName ? <p className="mt-1 text-xs font-semibold text-emerald-600">File dipilih: {form.logoName}</p> : null}
                    </div>
                  </div>
                </AdminField>
              </div>

              <AdminField label="Deskripsi Singkat" helper="Untuk ringkasan profil publik">
                <AdminTextarea
                  className="min-h-[120px]"
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                />
              </AdminField>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Narasi Lembaga"
            description="Perjelas sejarah lembaga dan konteks yang memperkuat kepercayaan pengunjung."
          >
            <div>
              <AdminField label="Sejarah Lembaga" helper="Ceritakan perjalanan dan perkembangan lembaga">
                <AdminTextarea
                  className="min-h-[190px] leading-7"
                  value={form.history}
                  onChange={(event) => updateField('history', event.target.value)}
                />
              </AdminField>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Visi & Misi"
            description="Jadikan arah lembaga lebih mudah dipahami lewat satu visi kuat dan daftar misi yang ringkas."
          >
            <div className="space-y-6">
              <AdminField label="Visi" helper="Pernyataan arah jangka panjang">
                <AdminTextarea
                  className="min-h-[110px] leading-7"
                  value={form.vision}
                  onChange={(event) => updateField('vision', event.target.value)}
                />
              </AdminField>

              <AdminField label="Misi" helper="Pisahkan tiap poin dengan baris baru">
                <AdminTextarea
                  className="min-h-[180px] leading-7"
                  value={form.mission}
                  onChange={(event) => updateField('mission', event.target.value)}
                />
              </AdminField>
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title="Kontak & Sosial"
            description="Pastikan alamat, kontak, dan tautan sosial resmi mudah ditemukan dan tetap konsisten."
          >
            <div className="space-y-6">
              <AdminField label="Alamat Lengkap">
                <AdminTextarea
                  icon={MapPin}
                  className="min-h-[120px] leading-7"
                  value={form.address}
                  onChange={(event) => updateField('address', event.target.value)}
                />
              </AdminField>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <AdminField label="Telepon / WhatsApp">
                  <AdminInput
                    icon={Phone}
                    value={form.phone}
                    onChange={(event) => updateField('phone', event.target.value)}
                  />
                </AdminField>

                <AdminField label="Email Resmi">
                  <AdminInput
                    icon={Mail}
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                  />
                </AdminField>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <AdminField label="Facebook">
                  <AdminInput
                    icon={Globe}
                    value={form.socialMedia.facebook?.url || ''}
                    onChange={(event) => updateSocial('facebook', event.target.value)}
                  />
                </AdminField>

                <AdminField label="Instagram">
                  <AdminInput
                    icon={Globe}
                    value={form.socialMedia.instagram?.url || ''}
                    onChange={(event) => updateSocial('instagram', event.target.value)}
                  />
                </AdminField>
              </div>
            </div>
          </AdminSectionCard>
        </div>

        <div className="space-y-6 lg:space-y-7 xl:sticky xl:top-8 xl:self-start">
          <AdminSidebarPanel
            title="Ringkasan Profil"
            description="Lihat kondisi konten saat ini sebelum menyimpan."
            contentClassName="space-y-5"
          >
              <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Target size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Kelengkapan</p>
                      <p className="text-xs text-slate-500">Data inti profil lembaga</p>
                    </div>
                  </div>
                  <AdminTag tone="blue">{completion}%</AdminTag>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[22px] border border-slate-100 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Identitas</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{form.name || 'Belum diisi'}</p>
                  <p className="mt-1 text-sm text-slate-500">{form.tagline || 'Tagline belum diisi'}</p>
                </div>

                <div className="rounded-[22px] border border-slate-100 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Kontak</p>
                  <p className="mt-2 text-sm text-slate-700">{form.phone || 'Telepon belum diisi'}</p>
                  <p className="mt-1 text-sm text-slate-500">{form.email || 'Email belum diisi'}</p>
                </div>
              </div>
          </AdminSidebarPanel>

          <AdminSidebarPanel
            title="Pratinjau Misi"
            description="Daftar poin misi yang akan muncul setelah data dipisah per baris."
            contentClassName="space-y-2"
          >
              {missionItems.length ? missionItems.map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-[20px] bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  {index + 1}. {item}
                </div>
              )) : (
                <p className="rounded-[20px] bg-slate-50 px-4 py-4 text-sm text-slate-500">Belum ada poin misi yang ditambahkan.</p>
              )}
          </AdminSidebarPanel>

          <AdminStickyBar>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Simpan perubahan profil</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Gunakan tombol ini saat Anda sudah selesai merapikan konten identitas, narasi, dan kontak lembaga.</p>
              </div>
              <AdminPrimaryButton className="w-full" form="profile-form" type="submit">
                <Save size={16} />
                Simpan Semua Perubahan
              </AdminPrimaryButton>
            </div>
          </AdminStickyBar>
        </div>
      </form>

      <AdminToast
        tone={toast.tone}
        title={toast.title}
        description={toast.description}
        onClose={() => setToast({ title: '', description: '', tone: 'emerald' })}
      />
    </div>
  );
}
