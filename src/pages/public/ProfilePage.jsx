import { Eye, Target, BookOpen, Building2 } from 'lucide-react';
import { usePublicProfileQuery } from '../../hooks/public/usePublicQueries';
import SEO from '../../components/SEO/SEO';
import './Pages.css';

export default function ProfilePage() {
  const { data: profile } = usePublicProfileQuery();
  const mission = Array.isArray(profile?.mission) ? profile.mission : [];

  return (
    <div className="page-wrapper">
      <SEO title="Profil Lembaga" description="Mengenal sejarah, visi, dan misi LKP Parduli Rasa Komputer - lembaga kursus dan pelatihan komputer." />
      <div className="page-hero">
        <div className="container">
          <h1>Profil Lembaga</h1>
          <p>Mengenal lebih dekat LKP Parduli Rasa Komputer</p>
        </div>
      </div>
      <div className="container section">
        <div className="profile-content">
          <div className="profile-section">
            <div className="profile-icon-box">
              <Building2 size={28} />
            </div>
            <div>
              <h2>Tentang Kami</h2>
              <p>{profile.description}</p>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-icon-box secondary">
              <BookOpen size={28} />
            </div>
            <div>
              <h2>Sejarah</h2>
              <p>{profile.history}</p>
            </div>
          </div>

          <div className="profile-grid">
            <div className="profile-card">
              <div className="profile-card-icon">
                <Eye size={24} />
              </div>
              <h3>Visi</h3>
              <p>{profile.vision}</p>
            </div>
            <div className="profile-card">
              <div className="profile-card-icon mint">
                <Target size={24} />
              </div>
              <h3>Misi</h3>
              <ul className="profile-mission-list">
                {mission.map((missionItem, index) => (
                  <li key={index}>{missionItem}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
