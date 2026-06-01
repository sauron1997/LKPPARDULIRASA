import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  MessageCircle,
  Monitor,
  PenTool,
  ShieldCheck,
  Sparkles,
  Star,
  Table,
  Users,
} from 'lucide-react';
import { usePublicLandingQuery } from '../../hooks/public/usePublicQueries';
import './LandingPage.css';

const whatsappMessage = encodeURIComponent('Halo Admin LKP Parduli Rasa, saya ingin konsultasi gratis tentang program kursus komputer.');

const courseIconMap = {
  FileText: BookOpen,
  Table,
  Presentation: LayoutDashboard,
  Image: ImageIcon,
  Palette: PenTool,
  PenTool,
};

const trustBadges = [
  { icon: <Award size={16} />, label: 'Sertifikat Resmi' },
  { icon: <Users size={16} />, label: 'Pengajar Praktisi' },
  { icon: <Sparkles size={16} />, label: 'Ramah Pemula' },
];

const benefits = [
  {
    icon: <Monitor size={28} />,
    title: 'Praktik Langsung di Lab',
    description: 'Setiap materi diarahkan ke latihan nyata agar siswa tidak hanya paham teori, tetapi juga percaya diri memakai aplikasi.',
  },
  {
    icon: <CalendarDays size={28} />,
    title: 'Jadwal Belajar Fleksibel',
    description: 'Pilihan jadwal dibuat ramah untuk pelajar, pekerja, dan masyarakat umum yang ingin meningkatkan skill komputer.',
  },
  {
    icon: <Award size={28} />,
    title: 'Sertifikat untuk Karir',
    description: 'Siswa mendapatkan bukti kelulusan resmi yang dapat dilampirkan untuk kebutuhan kerja atau pengembangan diri.',
  },
  {
    icon: <Users size={28} />,
    title: 'Pendampingan Instruktur',
    description: 'Instruktur membantu dari dasar sampai siswa mampu menyelesaikan tugas dan proyek sederhana secara mandiri.',
  },
  {
    icon: <ClipboardCheck size={28} />,
    title: 'Materi Siap Kerja',
    description: 'Kurikulum disusun untuk kebutuhan administrasi, desain, presentasi, dan keterampilan digital yang sering dipakai.',
  },
  {
    icon: <ShieldCheck size={28} />,
    title: 'Lembaga Terpercaya',
    description: 'Didukung pengalaman lembaga, data alumni, dan komitmen pembelajaran yang terarah untuk masyarakat.',
  },
];

const registrationSteps = [
  {
    step: '01',
    title: 'Pilih Program',
    description: 'Tentukan kelas yang sesuai dengan kebutuhan: Office, desain grafis, presentasi, atau aplikasi teknis.',
  },
  {
    step: '02',
    title: 'Isi Formulir',
    description: 'Lengkapi data pendaftaran secara online agar admin dapat membantu proses berikutnya.',
  },
  {
    step: '03',
    title: 'Mulai Belajar',
    description: 'Ikuti kelas praktik bersama instruktur dan bangun portofolio keterampilan komputer Anda.',
  },
];

const testimonials = [
  {
    name: 'Siti Nurhaliza',
    role: 'Alumni Microsoft Excel',
    quote: 'Materinya mudah diikuti dari dasar. Sekarang saya lebih percaya diri membuat laporan dan mengolah data kantor.',
  },
  {
    name: 'Budi Santoso',
    role: 'Alumni Desain Grafis',
    quote: 'Belajarnya banyak praktik, jadi saya bisa langsung membuat desain poster dan konten sederhana untuk usaha.',
  },
  {
    name: 'Fitri Handayani',
    role: 'Alumni PowerPoint',
    quote: 'Instrukturnya sabar dan jelas. Sertifikatnya juga membantu saya saat melamar pekerjaan administrasi.',
  },
];

const faqs = [
  {
    question: 'Apakah pemula bisa mengikuti kursus?',
    answer: 'Bisa. Program disusun bertahap dari dasar, sehingga peserta yang belum terbiasa memakai komputer tetap dapat mengikuti kelas.',
  },
  {
    question: 'Apakah peserta mendapatkan sertifikat?',
    answer: 'Ya. Peserta yang menyelesaikan program dan evaluasi akan mendapatkan sertifikat resmi dari LKP Parduli Rasa Komputer.',
  },
  {
    question: 'Bagaimana cara mengetahui jadwal kelas?',
    answer: 'Silakan daftar atau konsultasi melalui WhatsApp. Admin akan membantu mencocokkan program dan jadwal yang tersedia.',
  },
  {
    question: 'Apakah biaya kursus bisa dilihat sebelum daftar?',
    answer: 'Bisa. Ringkasan biaya tersedia di card program, dan detail lengkap dapat dilihat pada halaman paket kursus.',
  },
];

export default function LandingPage() {
  const { data } = usePublicLandingQuery();
  const profile = data?.profile || {};
  const courses = data?.courses || [];
  const whatsappPhone = String(profile.phone || '6281234567890').replace(/[^\d]/g, '');
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`;
  const featuredCourses = data?.featuredCourses || courses.slice(0, 3);
  const alumniStat = { value: profile.alumniCount || 0, suffix: '+' };
  const programStat = { value: courses.length, suffix: '' };
  const experienceStat = { value: Math.max(new Date().getFullYear() - (profile.foundedYear || new Date().getFullYear()), 1), suffix: '+' };
  const teacherStat = { value: profile.teacherCount || 0, suffix: '+' };

  return (
    <div className="landing-page">
      <section className="hero">
        <div className="hero-orb hero-orb-primary" />
        <div className="hero-orb hero-orb-secondary" />
        <div className="container hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <ShieldCheck size={16} />
              <span>Lembaga Kursus & Pelatihan Komputer</span>
            </div>
            <h1>Kuasai Skill Komputer Praktis untuk Kerja, Sekolah, dan Usaha</h1>
            <p>
              Belajar Microsoft Office, desain grafis, presentasi, dan aplikasi komputer bersama instruktur berpengalaman
              dengan materi bertahap, praktik langsung, dan sertifikat resmi.
            </p>

            <div className="hero-actions">
              <Link to="/daftar" className="btn btn-primary btn-lg">
                Daftar Sekarang <ArrowRight size={18} />
              </Link>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
                <MessageCircle size={18} /> Konsultasi Gratis
              </a>
            </div>

            <div className="hero-trust-badges" aria-label="Keunggulan ringkas">
              {trustBadges.map(({ icon, label }) => (
                <span key={label}>
                  {icon}
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-visual" aria-label="Dokumentasi kelas LKP Parduli Rasa">
            <div className="hero-media-card">
              <div className="hero-media-placeholder">
                <Monitor size={54} />
                <span>Dokumentasi Kelas</span>
                <small>Slot siap diganti dengan foto asli kegiatan belajar</small>
              </div>
              <div className="hero-media-caption">
                <div>
                  <strong>{profile.name}</strong>
                  <span>Belajar komputer dari dasar sampai siap praktik.</span>
                </div>
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div className="hero-floating-card hero-floating-card-top">
              <Award size={22} />
              <div>
                <strong>Akreditasi Aktif</strong>
                <span>Lembaga resmi & terpercaya</span>
              </div>
            </div>
            <div className="hero-floating-card hero-floating-card-bottom">
              <Users size={22} />
              <div>
                <strong>{alumniStat?.value}{alumniStat?.suffix} Alumni</strong>
                <span>Telah mengikuti pelatihan</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Ringkasan kepercayaan">
        <div className="container trust-strip-grid">
          <div className="trust-item">
            <strong>{alumniStat?.value}{alumniStat?.suffix}</strong>
            <span>Alumni Lulus</span>
          </div>
          <div className="trust-item">
            <strong>{programStat?.value}{programStat?.suffix}</strong>
            <span>Program Kursus</span>
          </div>
          <div className="trust-item">
            <strong>{experienceStat?.value}{experienceStat?.suffix}</strong>
            <span>Tahun Pengalaman</span>
          </div>
          <div className="trust-item">
            <strong>{teacherStat?.value}{teacherStat?.suffix}</strong>
            <span>Pengajar</span>
          </div>
        </div>
      </section>

      <section className="section benefits-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-eyebrow">Mengapa Memilih Kami?</span>
            <h2>Belajar lebih terarah, praktis, dan siap dipakai</h2>
            <p>Kami membantu peserta membangun keterampilan komputer yang relevan untuk sekolah, pekerjaan, dan usaha.</p>
          </div>
          <div className="benefits-grid">
            {benefits.map(({ icon, title, description }) => (
              <div className="benefit-card" key={title}>
                <div className="benefit-icon">
                  {icon}
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section programs-section">
        <div className="container">
          <div className="section-header flex-between">
            <div>
              <span className="section-eyebrow">Program Unggulan</span>
              <h2>Pilih kelas sesuai tujuan Anda</h2>
              <p>Mulai dari administrasi perkantoran sampai desain, setiap program dibuat bertahap dan mudah diikuti.</p>
            </div>
            <Link to="/paket-kursus" className="btn btn-outline">
              Lihat Semua <ChevronRight size={16} />
            </Link>
          </div>

          <div className="programs-grid">
            {featuredCourses.map((course, index) => {
              const Icon = courseIconMap[course.icon] || BookOpen;

              return (
                <article className={`card program-card ${index === 0 ? 'program-card-featured' : ''}`} key={course.id}>
                  <div className="program-card-header">
                    <div className="program-icon">
                      <Icon size={26} />
                    </div>
                    {index === 0 && <span className="badge badge-primary">Paling Diminati</span>}
                  </div>
                  <div className="card-body">
                    <h3>{course.title}</h3>
                    <p>{course.description}</p>

                    <div className="program-details">
                      <span><Clock size={15} /> {course.duration}</span>
                      <span><Sparkles size={15} /> {course.level}</span>
                    </div>

                    <div className="program-outcomes">
                      <strong>Yang dipelajari:</strong>
                      {course.materials.slice(0, 3).map((material) => (
                        <span key={material}><CheckCircle2 size={14} /> {material}</span>
                      ))}
                    </div>

                    <div className="program-footer">
                      <div>
                        <span className="program-price-label">Biaya mulai</span>
                        <strong className="program-price">{course.priceLabel || course.price}</strong>
                      </div>
                    </div>

                    <div className="program-actions">
                      <Link to="/paket-kursus" className="btn btn-outline btn-sm">Lihat Detail</Link>
                      <Link to="/daftar" className="btn btn-primary btn-sm">Daftar</Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section steps-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-eyebrow">Alur Pendaftaran</span>
            <h2>Mulai kursus dalam 3 langkah mudah</h2>
            <p>Prosesnya dibuat sederhana agar calon siswa bisa langsung mendapat arahan dari admin.</p>
          </div>
          <div className="steps-grid">
            {registrationSteps.map((item) => (
              <div className="step-card" key={item.step}>
                <span className="step-number">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section testimonials-section">
        <div className="container">
          <div className="section-header text-center">
            <span className="section-eyebrow">Cerita Alumni</span>
            <h2>Dipercaya siswa dari berbagai kebutuhan belajar</h2>
            <p>Testimoni sementara berikut menggambarkan manfaat yang ingin ditonjolkan sampai data alumni asli tersedia.</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((item) => (
              <article className="testimonial-card" key={item.name}>
                <div className="testimonial-rating" aria-label="Rating 5 bintang">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={16} fill="currentColor" />
                  ))}
                </div>
                <p>"{item.quote}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{item.name.charAt(0)}</div>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section faq-section">
        <div className="container faq-layout">
          <div className="faq-intro">
            <span className="section-eyebrow">FAQ</span>
            <h2>Pertanyaan yang sering ditanyakan</h2>
            <p>Masih ragu memilih program? Beberapa jawaban ini membantu calon siswa memahami proses belajar di LKP Parduli Rasa.</p>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              Tanya via WhatsApp <MessageCircle size={16} />
            </a>
          </div>
          <div className="faq-list">
            {faqs.map((item) => (
              <div className="faq-item" key={item.question}>
                <div className="faq-question">
                  <HelpCircle size={20} />
                  <h3>{item.question}</h3>
                </div>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section final-cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-content">
              <span className="cta-eyebrow">Siap mulai belajar?</span>
              <h2>Ambil langkah pertama untuk menguasai komputer dengan lebih percaya diri.</h2>
              <p>Daftar sekarang atau konsultasikan program yang paling sesuai dengan kebutuhan Anda bersama admin kami.</p>
              <div className="cta-actions">
                <Link to="/daftar" className="btn btn-secondary btn-lg">
                  Daftar Sekarang <ArrowRight size={18} />
                </Link>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-light-outline btn-lg">
                  <MessageCircle size={18} /> Konsultasi Gratis
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
