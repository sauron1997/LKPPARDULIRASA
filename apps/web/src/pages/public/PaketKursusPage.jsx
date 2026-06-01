import { Link } from 'react-router-dom';
import { ArrowRight, Download, FileText, Table, Presentation, Image, Palette, PenTool } from 'lucide-react';
import { usePublicCoursesQuery } from '../../hooks/public/usePublicQueries';
import SEO from '../../components/SEO/SEO';
import './Pages.css';

const iconMap = { FileText, Table, Presentation, Image, Palette, PenTool };

export default function PaketKursusPage() {
  const { data: courses = [] } = usePublicCoursesQuery();

  return (
    <div className="page-wrapper">
      <SEO title="Paket Kursus" description="Program kursus komputer LKP Parduli Rasa - Microsoft Office, Desain Grafis, dan AutoCAD beserta harga dan materi." />
      <div className="page-hero">
        <div className="container">
          <h1>Paket Kursus</h1>
          <p>Pilih program kursus yang sesuai dengan kebutuhan dan minat Anda</p>
        </div>
      </div>
      <div className="container section">
        <div className="paket-grid">
          {courses.map((course) => {
            const Icon = iconMap[course.icon] || FileText;
            return (
              <div key={course.id} className="paket-card card">
                <div className="paket-header">
                  <div className="paket-icon">
                    <Icon size={32} />
                  </div>
                  <h3>{course.title}</h3>
                </div>
                <div className="card-body">
                  <p className="paket-desc">{course.description}</p>
                  <div className="paket-details">
                    <div className="paket-detail-item">
                      <span>Durasi</span>
                      <strong>{course.duration}</strong>
                    </div>
                    <div className="paket-detail-item">
                      <span>Level</span>
                      <strong>{course.level}</strong>
                    </div>
                    <div className="paket-detail-item">
                      <span>Biaya</span>
                      <strong className="paket-price">{course.priceLabel}</strong>
                    </div>
                  </div>
                  <div className="paket-materi">
                    <h4>Materi:</h4>
                    <ul>
                      {course.materials.map((material, index) => (
                        <li key={index}>✓ {material}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="paket-actions">
                    <a
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      href={course.brochureUrl || '#'}
                      download={course.brochureName || `${course.title}.pdf`}
                      onClick={(event) => {
                        if (!course.brochureUrl) event.preventDefault();
                      }}
                    >
                      <Download size={14} /> Unduh Brosur
                    </a>
                    <Link to="/daftar" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                      Daftar <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
