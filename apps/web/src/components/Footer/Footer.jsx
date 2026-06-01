import { Link } from 'react-router-dom';
import { GraduationCap, MapPin, Phone, Mail, Facebook, Instagram, ArrowUpRight } from 'lucide-react';
import { usePublicCoursesQuery, usePublicProfileQuery } from '../../hooks/public/usePublicQueries';
import './Footer.css';

export default function Footer() {
  const coursesQuery = usePublicCoursesQuery();
  const profileQuery = usePublicProfileQuery();
  const courses = coursesQuery.data || [];
  const profile = profileQuery.data || {};
  const socialLinks = profile.socialLinks || {
    facebook: { enabled: false, url: '' },
    instagram: { enabled: false, url: '' },
  };
  const currentYear = new Date().getFullYear();
  const footerDescription = 'LKP Parduli Rasa Komputer membantu siswa, pekerja, dan masyarakat umum menguasai keterampilan komputer praktis melalui kursus terarah, instruktur berpengalaman, dan sertifikat resmi.';

  return (
    <footer className="footer">
      <div className="footer-wave">
        <svg viewBox="0 0 1440 100" preserveAspectRatio="none">
          <path d="M0,40 C360,100 1080,0 1440,60 L1440,100 L0,100 Z" fill="currentColor" />
        </svg>
      </div>

      <div className="footer-content">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <GraduationCap size={28} />
                <div>
                  <h3>LKP Parduli Rasa</h3>
                  <span>Komputer</span>
                </div>
              </div>
              <p>{footerDescription}</p>
              <div className="footer-social">
                {socialLinks.facebook.enabled ? (
                  <a href={socialLinks.facebook.url} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Facebook size={20} />
                  </a>
                ) : null}
                {socialLinks.instagram.enabled ? (
                  <a href={socialLinks.instagram.url} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Instagram size={20} />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="footer-links-col">
              <h4>Menu</h4>
              <ul>
                <li><Link to="/profile"><ArrowUpRight size={14} /> Profil</Link></li>
                <li><Link to="/galeri"><ArrowUpRight size={14} /> Galeri</Link></li>
                <li><Link to="/paket-kursus"><ArrowUpRight size={14} /> Program Kursus</Link></li>
                <li><Link to="/akreditasi"><ArrowUpRight size={14} /> Akreditasi</Link></li>
                <li><Link to="/contact"><ArrowUpRight size={14} /> Kontak</Link></li>
              </ul>
            </div>

            <div className="footer-links-col">
              <h4>Program Kursus</h4>
              <ul>
                {courses.slice(0, 6).map((course) => (
                  <li key={course.id}><Link to="/paket-kursus"><ArrowUpRight size={14} /> {course.title}</Link></li>
                ))}
              </ul>
            </div>

            <div className="footer-contact">
              <h4>Kontak</h4>
              <ul>
                <li><MapPin size={16} /> {profile.address}</li>
                <li><Phone size={16} /> {profile.phone}</li>
                <li><Mail size={16} /> {profile.email}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {currentYear} LKP Parduli Rasa Komputer. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
