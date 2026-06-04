import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from '@/components/ui/sonner';

const PublicLayout = lazy(() => import('./layouts/PublicLayout'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));

// Lazy load all public pages
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const BlogPage = lazy(() => import('./pages/public/BlogPage'));
const BlogDetail = lazy(() => import('./pages/public/BlogDetail'));
const ProfilePage = lazy(() => import('./pages/public/ProfilePage'));
const GaleriPage = lazy(() => import('./pages/public/GaleriPage'));
const PaketKursusPage = lazy(() => import('./pages/public/PaketKursusPage'));
const SiswaKursusPage = lazy(() => import('./pages/public/SiswaKursusPage'));
const AkreditasiPage = lazy(() => import('./pages/public/AkreditasiPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const PaymentPage = lazy(() => import('./pages/public/PaymentPage'));

// Lazy load dashboard pages
const PembayaranPage = lazy(() => import('./pages/dashboard/PembayaranPage'));
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'));
const IdentitasPage = lazy(() => import('./pages/dashboard/IdentitasPage'));
const SertifikatPage = lazy(() => import('./pages/dashboard/SertifikatPage'));
const MateriPage = lazy(() => import('./pages/dashboard/MateriPage'));
const StudentClassroomPage = lazy(() => import('./pages/dashboard/StudentClassroomPage'));
const PesanPage = lazy(() => import('./pages/dashboard/PesanPage'));

// Lazy load admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminBlog = lazy(() => import('./pages/admin/AdminBlog'));
const AdminGaleri = lazy(() => import('./pages/admin/AdminGaleri'));
const AdminProfil = lazy(() => import('./pages/admin/AdminProfil'));
const AdminPaketKursus = lazy(() => import('./pages/admin/AdminPaketKursus'));
const AdminAkreditasi = lazy(() => import('./pages/admin/AdminAkreditasi'));
const AdminSertifikat = lazy(() => import('./pages/admin/AdminSertifikat'));
const AdminClassroom = lazy(() => import('./pages/admin/AdminClassroom'));
const AdminRespon = lazy(() => import('./pages/admin/AdminRespon'));
const AdminPesanSiswa = lazy(() => import('./pages/admin/AdminPesanSiswa'));
const AdminSosialMedia = lazy(() => import('./pages/admin/AdminSosialMedia'));
const AdminPaymentReviews = lazy(() => import('./pages/admin/AdminPaymentReviews'));
const AdminPaymentSettings = lazy(() => import('./pages/admin/AdminPaymentSettings'));

import './index.css';

function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      color: 'var(--text-secondary)',
      fontSize: '1.125rem'
    }}>
      Loading...
    </div>
  );
}

function AuthBoundary({ scope }) {
  return (
    <AuthProvider scope={scope}>
      <Outlet />
    </AuthProvider>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route element={<AuthBoundary scope="public" />}>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<LandingPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:id" element={<BlogDetail />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/galeri" element={<GaleriPage />} />
                <Route path="/paket-kursus" element={<PaketKursusPage />} />
                <Route path="/siswa-kursus" element={<SiswaKursusPage />} />
                <Route path="/akreditasi" element={<AkreditasiPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/daftar" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/payment/:enrollmentId" element={<PaymentPage />} />
              </Route>
            </Route>

            <Route element={<AuthBoundary scope="protected" />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardHome />} />
                <Route path="/dashboard/identitas" element={<IdentitasPage />} />
                <Route path="/dashboard/sertifikat" element={<SertifikatPage />} />
                <Route path="/dashboard/classroom" element={<Navigate to="/dashboard/classroom/classwork" replace />} />
                <Route path="/dashboard/classroom/:tab" element={<StudentClassroomPage />} />
                <Route path="/dashboard/materi" element={<MateriPage />} />
                <Route path="/dashboard/pesan" element={<PesanPage />} />
                <Route path="/dashboard/pembayaran" element={<PembayaranPage />} />
              </Route>

              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/blog" element={<AdminBlog />} />
                <Route path="/admin/galeri" element={<AdminGaleri />} />
                <Route path="/admin/profil" element={<AdminProfil />} />
                <Route path="/admin/paket-kursus" element={<AdminPaketKursus />} />
                <Route path="/admin/akreditasi" element={<AdminAkreditasi />} />
                <Route path="/admin/sertifikat" element={<AdminSertifikat />} />
                <Route path="/admin/classroom" element={<AdminClassroom />} />
                <Route path="/admin/classroom/:courseId/:tab" element={<AdminClassroom />} />
                <Route path="/admin/siswa" element={<Navigate to="/admin/classroom" replace />} />
                <Route path="/admin/respon" element={<AdminRespon />} />
                <Route path="/admin/pesan-siswa" element={<AdminPesanSiswa />} />
                <Route path="/admin/sosial-media" element={<AdminSosialMedia />} />
                <Route path="/admin/payment-reviews" element={<AdminPaymentReviews />} />
                <Route path="/admin/payment-settings" element={<AdminPaymentSettings />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster closeButton position="bottom-right" />
    </HelmetProvider>
  );
}

export default App;
