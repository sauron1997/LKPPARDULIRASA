import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Facebook, Instagram, LogIn, UserPlus, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { usePublicProfileQuery } from '../../hooks/public/usePublicQueries';
import './Navbar.css';

const navLinks = [
  { path: '/', label: 'Beranda' },
  { path: '/paket-kursus', label: 'Program' },
  { path: '/galeri', label: 'Galeri' },
  { path: '/akreditasi', label: 'Akreditasi' },
  { path: '/blog', label: 'Blog' },
  { path: '/contact', label: 'Kontak' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { isAuthenticated, isAdmin } = useAuth();
  const profileQuery = usePublicProfileQuery();
  const socialLinks = profileQuery.data?.socialLinks || {
    facebook: { enabled: false, url: '' },
    instagram: { enabled: false, url: '' },
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo">
            <GraduationCap size={28} />
          </div>
          <div className="navbar-brand-text">
            <span className="navbar-brand-title">LKP Parduli Rasa</span>
            <span className="navbar-brand-sub">Komputer</span>
          </div>
        </Link>

        <div className={`navbar-links ${isOpen ? 'active' : ''}`}>
          <div className="navbar-links-inner">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="navbar-actions">
          <div className="navbar-social">
            {socialLinks.facebook.enabled ? (
              <a href={socialLinks.facebook.url} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook">
                <Facebook size={18} />
              </a>
            ) : null}
            {socialLinks.instagram.enabled ? (
              <a href={socialLinks.instagram.url} target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram">
                <Instagram size={18} />
              </a>
            ) : null}
          </div>

          {isAuthenticated ? (
            <Link to={isAdmin ? '/admin' : '/dashboard'} className="btn btn-primary btn-sm" onClick={() => setIsOpen(false)}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm navbar-btn-login" onClick={() => setIsOpen(false)}>
                <LogIn size={16} /> Login
              </Link>
              <Link to="/daftar" className="btn btn-primary btn-sm navbar-btn-register" onClick={() => setIsOpen(false)}>
                <UserPlus size={16} /> Daftar
              </Link>
            </>
          )}
        </div>

        <button
          className="navbar-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Navigation"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isOpen && <div className="navbar-backdrop" onClick={() => setIsOpen(false)} />}
    </nav>
  );
}
