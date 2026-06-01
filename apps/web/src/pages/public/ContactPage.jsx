import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Send, MapPin, Phone, Mail, CheckCircle } from 'lucide-react';
import SEO from '../../components/SEO/SEO';
import { useSubmitPublicContactMessageMutation } from '../../hooks/public/usePublicMutations';
import { usePublicProfileQuery } from '../../hooks/public/usePublicQueries';
import './Pages.css';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const { data: profile } = usePublicProfileQuery();
  const submitMessageMutation = useSubmitPublicContactMessageMutation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm();

  const onSubmit = async (data) => {
    try {
      await submitMessageMutation.mutateAsync({
        name: data.name.trim(),
        email: data.email.trim(),
        address: data.address.trim(),
        message: data.message.trim(),
      });

      setSubmitted(true);
      window.setTimeout(() => { setSubmitted(false); reset(); }, 5000);
    } catch {
      // Mutation state handles the error message shown to the user.
    }
  };

  return (
    <div className="page-wrapper">
      <SEO title="Hubungi Kami" description="Kirimkan pertanyaan seputar Program Kursus Komputer LKP Parduli Rasa kepada kami." />
      <div className="page-hero">
        <div className="container">
          <h1>Hubungi Kami</h1>
          <p>Kirimkan pertanyaan seputar Program Kursus Komputer kepada kami</p>
        </div>
      </div>
      <div className="container section">
        <div className="contact-layout">
          <div className="contact-form-wrapper">
            <h2>Kirim Pesan</h2>
            <p>Pertanyaan Anda akan langsung dikirim ke pihak Admin dan akan direspon secepatnya.</p>
            {submitted && (
              <div className="alert alert-success">
                <CheckCircle size={18} /> Pesan berhasil dikirim! Admin akan segera merespon pertanyaan Anda.
              </div>
            )}
            {submitMessageMutation.error ? (
              <div className="alert alert-danger" role="alert">
                {submitMessageMutation.error.message || 'Pesan belum bisa dikirim. Silakan coba lagi.'}
              </div>
            ) : null}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="form-group">
                <label className="required" htmlFor="contact-name">Nama</label>
                <input
                  id="contact-name"
                  type="text"
                  placeholder="Nama lengkap Anda"
                  autoComplete="name"
                  className={errors.name ? 'input-error' : ''}
                  aria-describedby={errors.name ? 'contact-name-error' : undefined}
                  aria-invalid={errors.name ? 'true' : 'false'}
                  {...register('name', {
                    required: 'Nama wajib diisi',
                    minLength: { value: 3, message: 'Nama minimal 3 karakter' }
                  })}
                />
                {errors.name && (
                  <span id="contact-name-error" className="form-error" role="alert">
                    {errors.name.message}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label className="required" htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  type="email"
                  placeholder="email@contoh.com"
                  autoComplete="email"
                  className={errors.email ? 'input-error' : ''}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  aria-invalid={errors.email ? 'true' : 'false'}
                  {...register('email', {
                    required: 'Email wajib diisi',
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Format email tidak valid' }
                  })}
                />
                {errors.email && (
                  <span id="contact-email-error" className="form-error" role="alert">
                    {errors.email.message}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label className="required" htmlFor="contact-address">Alamat</label>
                <input
                  id="contact-address"
                  type="text"
                  placeholder="Alamat lengkap Anda"
                  autoComplete="street-address"
                  className={errors.address ? 'input-error' : ''}
                  aria-describedby={errors.address ? 'contact-address-error' : undefined}
                  aria-invalid={errors.address ? 'true' : 'false'}
                  {...register('address', { required: 'Alamat wajib diisi' })}
                />
                {errors.address && (
                  <span id="contact-address-error" className="form-error" role="alert">
                    {errors.address.message}
                  </span>
                )}
              </div>
              <div className="form-group">
                <label className="required" htmlFor="contact-message">Pertanyaan / Pesan</label>
                <textarea
                  id="contact-message"
                  placeholder="Tulis pertanyaan Anda seputar program kursus komputer..."
                  autoComplete="off"
                  className={errors.message ? 'input-error' : ''}
                  aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  aria-invalid={errors.message ? 'true' : 'false'}
                  {...register('message', {
                    required: 'Pesan wajib diisi',
                    minLength: { value: 10, message: 'Pesan minimal 10 karakter' }
                  })}
                />
                {errors.message && (
                  <span id="contact-message-error" className="form-error" role="alert">
                    {errors.message.message}
                  </span>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={isSubmitting || submitMessageMutation.isPending}
              >
                <Send size={16} /> {isSubmitting || submitMessageMutation.isPending ? 'Mengirim...' : 'Kirim Pesan'}
              </button>
            </form>
          </div>
          <div className="contact-info-wrapper">
            <div className="contact-info-card">
              <h3>Informasi Kontak</h3>
              <div className="contact-info-list">
                <div className="contact-info-item">
                  <div className="contact-info-icon"><MapPin size={20} /></div>
                  <div>
                    <strong>Alamat</strong>
                    <p>{profile.address}</p>
                  </div>
                </div>
                <div className="contact-info-item">
                  <div className="contact-info-icon"><Phone size={20} /></div>
                  <div>
                    <strong>Telepon</strong>
                    <p>{profile.phone}</p>
                  </div>
                </div>
                <div className="contact-info-item">
                  <div className="contact-info-icon"><Mail size={20} /></div>
                  <div>
                    <strong>Email</strong>
                    <p>{profile.email}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="contact-map">
              <div className="map-placeholder">
                <MapPin size={48} />
                <span>Google Maps</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
