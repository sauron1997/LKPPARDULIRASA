import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, Mail, Phone, Save, UserRound } from 'lucide-react';
import { useUpdateStudentProfileMutation } from '../../hooks/student/useStudentMutations';
import { useStudentDashboardData } from '../../hooks/student/useStudentDashboardData';
import './Dashboard.css';

export default function IdentitasPage() {
  const { portal, isReady, error } = useStudentDashboardData();
  const updateProfileMutation = useUpdateStudentProfileMutation();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
  });

  useEffect(() => {
    if (!portal.student) {
      return;
    }

    reset({
      name: portal.student.name || '',
      email: portal.student.email || '',
      phone: portal.student.phone || '',
      address: portal.student.address || '',
    });
  }, [portal.student, reset]);

  const handleSave = async (values) => {
    if (!portal.student) {
      return;
    }

    await updateProfileMutation.mutateAsync({
      name: String(values.name || '').trim(),
      email: String(values.email || '').trim().toLowerCase(),
      phone: String(values.phone || '').trim(),
      address: String(values.address || '').trim(),
    });

    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  if (!isReady) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card">
          <h2>Memuat profil siswa...</h2>
          <p>Data identitas Anda sedang disiapkan.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card danger">
          <h2>Profil belum bisa dimuat</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!portal.student) {
    return (
      <div className="dash-page animate-fade-in">
        <div className="dash-state-card">
          <h2>Data identitas belum ditemukan</h2>
          <p>Akun ini belum terhubung ke record siswa. Silakan hubungi admin.</p>
        </div>
      </div>
    );
  }

  const paymentStatus = portal.enrollment?.paymentStatus || portal.student.paymentStatus || 'pending';

  return (
    <div className="dash-page animate-fade-in">
      <section className="student-section-header">
        <div>
          <span className="student-section-eyebrow">Profil</span>
          <h2>Identitas siswa</h2>
          <p className="dash-subtitle">Perbarui data kontak agar admin mudah melakukan verifikasi belajar dan konsultasi.</p>
        </div>
        <div className="student-section-badges">
          <span className="student-pill muted">NIS {portal.student.nis}</span>
          <span className={`student-status-chip ${paymentStatus}`}>{paymentStatus === 'verified' ? 'Pembayaran valid' : paymentStatus === 'rejected' ? 'Perlu tindak lanjut' : 'Menunggu verifikasi'}</span>
        </div>
      </section>

      {saved ? (
        <div className="alert alert-success">
          <CheckCircle2 size={18} /> Profil siswa berhasil diperbarui.
        </div>
      ) : null}

      <section className="student-two-column">
        <article className="student-panel-card">
          <div className="student-panel-heading">
            <div>
              <span className="student-section-eyebrow">Ringkasan Akun</span>
              <h3>Status akses siswa</h3>
            </div>
          </div>

          <div className="student-focus-list">
            <div className="student-focus-item">
              <UserRound size={18} />
              <div>
                <strong>Program aktif</strong>
                <p>{portal.course?.title || portal.student.program || 'Belum ditentukan'}</p>
              </div>
            </div>
            <div className="student-focus-item">
              <Mail size={18} />
              <div>
                <strong>Email login</strong>
                <p>{portal.account?.email || portal.student.email}</p>
              </div>
            </div>
            <div className="student-focus-item">
              <Phone size={18} />
              <div>
                <strong>Kontak utama</strong>
                <p>{portal.student.phone || 'Belum diisi'}</p>
              </div>
            </div>
          </div>
        </article>

        <article className="dash-form-card">
          <div className="student-panel-heading">
            <div>
              <span className="student-section-eyebrow">Edit Profil</span>
              <h3>Perbarui data kontak</h3>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(async (values) => {
              try {
                await handleSave(values);
              } catch (submitError) {
                window.alert(submitError.message);
              }
            })}
            noValidate
          >
            <div className="form-row">
              <div className="form-group">
                <label className="required" htmlFor="student-profile-name">Nama Lengkap</label>
                <input
                  id="student-profile-name"
                  className={errors.name ? 'input-error' : ''}
                  {...register('name', {
                    required: 'Nama wajib diisi',
                    minLength: { value: 3, message: 'Nama minimal 3 karakter' },
                  })}
                />
                {errors.name ? <span className="form-error">{errors.name.message}</span> : null}
              </div>
              <div className="form-group">
                <label className="required" htmlFor="student-profile-email">Email</label>
                <input
                  id="student-profile-email"
                  type="email"
                  className={errors.email ? 'input-error' : ''}
                  {...register('email', {
                    required: 'Email wajib diisi',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Format email tidak valid' },
                  })}
                />
                {errors.email ? <span className="form-error">{errors.email.message}</span> : null}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="required" htmlFor="student-profile-phone">No HP</label>
                <input
                  id="student-profile-phone"
                  className={errors.phone ? 'input-error' : ''}
                  {...register('phone', {
                    required: 'No HP wajib diisi',
                    pattern: { value: /^08[0-9]{8,13}$/, message: 'Format: 08xxxxxxxxxx' },
                  })}
                />
                {errors.phone ? <span className="form-error">{errors.phone.message}</span> : null}
              </div>
              <div className="form-group">
                <label htmlFor="student-profile-program">Program Kursus</label>
                <input
                  id="student-profile-program"
                  disabled
                  value={portal.course?.title || portal.student.program || '-'}
                  readOnly
                />
              </div>
            </div>
            <div className="form-group">
              <label className="required" htmlFor="student-profile-address">Alamat</label>
              <textarea
                id="student-profile-address"
                className={errors.address ? 'input-error' : ''}
                {...register('address', { required: 'Alamat wajib diisi' })}
              />
              {errors.address ? <span className="form-error">{errors.address.message}</span> : null}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isDirty || isSubmitting || updateProfileMutation.isPending}
            >
              <Save size={16} /> {(isSubmitting || updateProfileMutation.isPending) ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}
