import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { AlertCircle, CheckCircle2, GraduationCap, LogIn } from 'lucide-react';
import SEO from '../../components/SEO/SEO';
import { FormField } from '../../components/ui/form-field';
import { AuthCardSkeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../context/useAuth';
import './Pages.css';

export default function LoginPage() {
  const [error, setError] = useState('');
  const { login, isAuthenticated, isAdmin, isLoadingSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      identifier: location.state?.registeredEmail || '',
      password: '',
    },
  });

  if (isLoadingSession) {
    return <AuthCardSkeleton title="Memuat halaman login…" />;
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  }

  const onSubmit = async (data) => {
    setError('');
    const result = await login(data.identifier.trim(), data.password);

    if (result.success) {
      navigate(result.user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      return;
    }

    setError(result.message || 'Email, NIS, username, atau password tidak cocok.');
  };

  return (
    <div className="page-wrapper">
      <SEO title="Login" description="Masuk ke akun dashboard LKP Parduli Rasa Komputer." />
      <div className="container section">
        <div className="auth-card login-card animate-scale-up">
          <div className="login-header">
            <div className="login-logo">
              <GraduationCap size={32} />
            </div>
            <h2>Login Dashboard</h2>
            <p>Masuk dengan email, username, atau NIS yang terdaftar untuk membuka dashboard belajar.</p>
          </div>

          {location.state?.registeredEmail ? (
            <div className="alert alert-success" role="status" aria-live="polite">
              <CheckCircle2 size={18} /> Akun berhasil dibuat. Lanjutkan login dengan email {location.state.registeredEmail}.
            </div>
          ) : null}

          {error ? (
            <div className="alert alert-danger" role="alert" aria-live="polite">
              <AlertCircle size={18} /> {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FormField
              label="Email, Username, atau NIS"
              name="identifier"
              id="login-identifier"
              type="text"
              placeholder="contoh: email@contoh.com atau PRK-2026-001"
              autoComplete="username"
              required
              error={errors.identifier?.message}
              hint="Siswa baru menggunakan email saat pendaftaran. Admin tetap bisa login dengan username lama."
              {...register('identifier', { required: 'Identifier login wajib diisi' })}
            />
            <FormField
              label="Password"
              name="password"
              id="login-password"
              type="password"
              placeholder="Masukkan password"
              autoComplete="current-password"
              required
              error={errors.password?.message}
              {...register('password', { required: 'Password wajib diisi' })}
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={isSubmitting}>
              <LogIn size={16} /> {isSubmitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="auth-footer">
            Belum punya akun? <Link to="/daftar">Daftar di sini</Link>
          </div>

          <div className="login-demo">
            <small><strong>Catatan akses:</strong></small>
            <small>Siswa: gunakan email, username, atau NIS yang terdaftar beserta password pendaftaran.</small>
            <small>Admin demo: `admin / admin123`.</small>
          </div>
        </div>
      </div>
    </div>
  );
}
