import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { ArrowLeft, ArrowRight, CheckCircle, Upload, UserPlus } from 'lucide-react';
import SEO from '../../components/SEO/SEO';
import { useCreateRegistrationMutation } from '../../hooks/registrations/useRegistrationMutations';
import { useRegistrationOptionsQuery } from '../../hooks/registrations/useRegistrationQueries';
import './Pages.css';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [identityFile, setIdentityFile] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [submitError, setSubmitError] = useState('');
  const registrationOptionsQuery = useRegistrationOptionsQuery();
  const registrationMutation = useCreateRegistrationMutation();
  const courses = registrationOptionsQuery.data?.courses || [];

  const {
    register,
    handleSubmit,
    control,
    trigger,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ mode: 'onChange' });

  const password = useWatch({ control, name: 'password' });
  const isLoadingOptions = registrationOptionsQuery.isPending || registrationOptionsQuery.isLoading;
  const optionsError = registrationOptionsQuery.error?.message || '';
  const isReady = !isLoadingOptions;

  const onSubmit = async (data) => {
    setSubmitError('');
    const normalizedEmail = normalizeEmail(data.email);
    const selectedCourse = courses.find((course) => String(course.id) === String(data.courseId)) || null;

    if (!selectedCourse) {
      setStep(4);
      setError('courseId', { type: 'manual', message: 'Pilih program kursus terlebih dahulu.' });
      return;
    }

    try {
      const result = await registrationMutation.mutateAsync({
        name: data.name.trim(),
        email: normalizedEmail,
        password: data.password,
        address: data.address.trim(),
        phone: data.phone.trim(),
        courseId: selectedCourse.id,
        identityAttachmentName: identityFile?.name || '',
      });

      const nextEmail = normalizeEmail(result?.registeredEmail || normalizedEmail);
      setRegisteredEmail(nextEmail);
      setSubmitted(true);
      window.setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { registeredEmail: nextEmail },
        });
      }, 2200);
    } catch (error) {
      const fieldByCode = {
        NAME_REQUIRED: { field: 'name', step: 1 },
        EMAIL_REQUIRED: { field: 'email', step: 1 },
        PASSWORD_REQUIRED: { field: 'password', step: 1 },
        EMAIL_ALREADY_REGISTERED: { field: 'email', step: 1 },
        ADDRESS_REQUIRED: { field: 'address', step: 2 },
        PHONE_REQUIRED: { field: 'phone', step: 2 },
        COURSE_REQUIRED: { field: 'courseId', step: 4 },
        COURSE_NOT_FOUND: { field: 'courseId', step: 4 },
      };
      const mappedField = fieldByCode[error.code];

      if (mappedField) {
        setStep(mappedField.step);
        setError(mappedField.field, {
          type: 'server',
          message: error.message || 'Pendaftaran belum bisa diproses.',
        });
        return;
      }

      setSubmitError(error.message || 'Pendaftaran belum bisa diproses. Silakan coba lagi.');
    }
  };

  const handleNext = async () => {
    let fields = [];
    if (step === 1) fields = ['name', 'email', 'password', 'confirmPassword'];
    if (step === 2) fields = ['address', 'phone'];
    if (step === 4) fields = ['courseId'];

    const valid = await trigger(fields);
    if (valid) setStep((current) => current + 1);
  };

  if (!isReady) {
    return (
      <div className="page-wrapper">
        <SEO title="Pendaftaran Siswa Baru" description="Memuat formulir pendaftaran siswa baru." />
        <div className="container section">
          <div className="auth-card">
            <p>Menyiapkan formulir pendaftaran...</p>
          </div>
        </div>
      </div>
    );
  }

  if (optionsError) {
    return (
      <div className="page-wrapper">
        <SEO title="Pendaftaran Siswa Baru" description="Formulir pendaftaran siswa baru belum bisa dimuat." />
        <div className="container section">
          <div className="auth-card">
            <h2>Formulir belum bisa dimuat</h2>
            <p>{optionsError}</p>
            <button type="button" className="btn btn-primary" onClick={() => registrationOptionsQuery.refetch()}>
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="page-wrapper">
        <SEO title="Pendaftaran Berhasil" description="Pendaftaran siswa baru berhasil." />
        <div className="container section">
          <div className="auth-card animate-scale-up">
            <div className="register-success">
              <div className="success-icon"><CheckCircle size={48} /></div>
              <h2>Pendaftaran Berhasil</h2>
              <p>Akun siswa Anda sudah dibuat dengan email <strong>{registeredEmail}</strong>. Anda akan diarahkan ke halaman login.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <SEO title="Pendaftaran Siswa Baru" description="Daftarkan diri Anda untuk mengikuti program kursus komputer di LKP Parduli Rasa Komputer." />
      <div className="page-hero">
        <div className="container">
          <h1>Pendaftaran Siswa Baru</h1>
          <p>Buat akun siswa dan pilih program yang ingin Anda ikuti.</p>
        </div>
      </div>
      <div className="container section">
        <div className="auth-card">
          <div className="register-steps">
            {[1, 2, 3, 4].map((currentStep) => (
              <div key={currentStep} className={`step-item ${step >= currentStep ? 'active' : ''} ${step > currentStep ? 'completed' : ''}`}>
                <div className="step-number">{step > currentStep ? 'OK' : currentStep}</div>
                <span>{currentStep === 1 ? 'Akun' : currentStep === 2 ? 'Data Diri' : currentStep === 3 ? 'Identitas' : 'Program'}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {submitError ? (
              <div className="alert alert-danger" role="alert" aria-live="polite">
                {submitError}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="animate-fade-in">
                <div className="form-group">
                  <label className="required" htmlFor="register-name">Nama Lengkap</label>
                  <input
                    id="register-name"
                    placeholder="Masukkan nama lengkap"
                    autoComplete="name"
                    className={errors.name ? 'input-error' : ''}
                    {...register('name', {
                      required: 'Nama wajib diisi',
                      minLength: { value: 3, message: 'Nama minimal 3 karakter' },
                    })}
                  />
                  {errors.name ? <span className="form-error">{errors.name.message}</span> : null}
                </div>
                <div className="form-group">
                  <label className="required" htmlFor="register-email">Email Login</label>
                  <input
                    id="register-email"
                    type="email"
                    placeholder="email@contoh.com"
                    autoComplete="email"
                    className={errors.email ? 'input-error' : ''}
                    {...register('email', {
                      required: 'Email wajib diisi',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Format email tidak valid' },
                    })}
                  />
                  {errors.email ? (
                    <span className="form-error">{errors.email.message}</span>
                  ) : (
                    <small>Gunakan email ini untuk login ke dashboard siswa.</small>
                  )}
                </div>
                <div className="form-group">
                  <label className="required" htmlFor="register-password">Password</label>
                  <input
                    id="register-password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    autoComplete="new-password"
                    className={errors.password ? 'input-error' : ''}
                    {...register('password', {
                      required: 'Password wajib diisi',
                      minLength: { value: 6, message: 'Password minimal 6 karakter' },
                    })}
                  />
                  {errors.password ? <span className="form-error">{errors.password.message}</span> : null}
                </div>
                <div className="form-group">
                  <label className="required" htmlFor="register-confirm">Konfirmasi Password</label>
                  <input
                    id="register-confirm"
                    type="password"
                    placeholder="Ulangi password"
                    autoComplete="new-password"
                    className={errors.confirmPassword ? 'input-error' : ''}
                    {...register('confirmPassword', {
                      required: 'Konfirmasi password wajib diisi',
                      validate: (value) => value === password || 'Password tidak cocok',
                    })}
                  />
                  {errors.confirmPassword ? <span className="form-error">{errors.confirmPassword.message}</span> : null}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="animate-fade-in">
                <div className="form-group">
                  <label className="required" htmlFor="register-address">Alamat</label>
                  <textarea
                    id="register-address"
                    placeholder="Alamat lengkap"
                    autoComplete="street-address"
                    className={errors.address ? 'input-error' : ''}
                    {...register('address', { required: 'Alamat wajib diisi' })}
                  />
                  {errors.address ? <span className="form-error">{errors.address.message}</span> : null}
                </div>
                <div className="form-group">
                  <label className="required" htmlFor="register-phone">No HP</label>
                  <input
                    id="register-phone"
                    placeholder="08xxxxxxxxxx"
                    autoComplete="tel"
                    className={errors.phone ? 'input-error' : ''}
                    {...register('phone', {
                      required: 'No HP wajib diisi',
                      pattern: { value: /^08[0-9]{8,13}$/, message: 'Format: 08xxxxxxxxxx (10-15 digit)' },
                    })}
                  />
                  {errors.phone ? <span className="form-error">{errors.phone.message}</span> : null}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="animate-fade-in">
                <div className="form-group">
                  <label htmlFor="register-identity">Lampiran Identitas (opsional)</label>
                  <div className="file-upload-area">
                    <Upload size={32} />
                    <span>Klik atau seret file ke sini</span>
                    <small>Format: JPG, PNG, PDF (maks. 2MB)</small>
                    <input id="register-identity" type="file" onChange={(event) => setIdentityFile(event.target.files?.[0] || null)} accept="image/*,.pdf" />
                  </div>
                  {identityFile ? <p className="file-name">OK {identityFile.name}</p> : <small>Nama file akan dicatat untuk kebutuhan verifikasi admin.</small>}
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="animate-fade-in">
                <div className="form-group">
                  <label className="required" htmlFor="register-program">Pilih Program Kursus</label>
                  <select
                    id="register-program"
                    className={errors.courseId ? 'input-error' : ''}
                    {...register('courseId', { required: 'Pilih program kursus' })}
                  >
                    <option value="">-- Pilih Program --</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title} - {course.priceLabel || course.price}
                      </option>
                    ))}
                  </select>
                  {errors.courseId ? <span className="form-error">{errors.courseId.message}</span> : null}
                </div>
              </div>
            ) : null}

            <div className="register-actions">
              {step > 1 ? (
                <button type="button" className="btn btn-outline" onClick={() => setStep((current) => current - 1)}>
                  <ArrowLeft size={16} /> Kembali
                </button>
              ) : (
                <Link to="/login" className="btn btn-outline">
                  <ArrowLeft size={16} /> Ke Login
                </Link>
              )}

              {step < 4 ? (
                <button type="button" className="btn btn-primary" onClick={handleNext}>
                  Lanjut <ArrowRight size={16} />
                </button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || registrationMutation.isPending}>
                  <UserPlus size={16} /> {isSubmitting || registrationMutation.isPending ? 'Memproses...' : 'Daftarkan Saya'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
