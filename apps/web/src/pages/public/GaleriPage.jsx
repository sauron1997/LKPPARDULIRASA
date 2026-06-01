import { useState } from 'react';
import { Image, Video, X } from 'lucide-react';
import { usePublicGalleryQuery } from '../../hooks/public/usePublicQueries';
import SEO from '../../components/SEO/SEO';
import './Pages.css';

function getCover(item) {
  return item.media?.find((media) => media.id === item.coverId)
    || item.media?.[0]
    || null;
}

export default function GaleriPage() {
  const { data: items = [] } = usePublicGalleryQuery();
  const [filter, setFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null);

  const filtered = filter === 'all' ? items : items.filter((item) => item.type === filter);

  return (
    <div className="page-wrapper">
      <SEO title="Galeri" description="Dokumentasi foto dan video kegiatan LKP Parduli Rasa Komputer." />
      <div className="page-hero">
        <div className="container">
          <h1>Galeri</h1>
          <p>Dokumentasi foto dan video kegiatan LKP Parduli Rasa</p>
        </div>
      </div>
      <div className="container section">
        <div className="gallery-filters">
          {['all', 'photo', 'video'].map((filterName) => (
            <button key={filterName} className={`btn btn-sm ${filter === filterName ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(filterName)}>
              {filterName === 'all' ? 'Semua' : filterName === 'photo' ? 'Foto' : 'Video'}
            </button>
          ))}
        </div>
        <div className="gallery-grid">
          {filtered.map((item) => {
            const cover = getCover(item);
            return (
              <div key={item.id} className="gallery-item card" onClick={() => setLightbox(item)}>
                <div className="gallery-image">
                  {cover?.url ? (
                    <img
                      src={cover.url}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="img-optimized"
                    />
                  ) : (
                    <div className="gallery-placeholder">
                      {item.type === 'photo' ? <Image size={40} /> : <Video size={40} />}
                    </div>
                  )}
                  <div className="gallery-overlay">
                    <span>{item.title}</span>
                  </div>
                </div>
                <div className="card-body">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {lightbox ? (
        <div className="modal-overlay" onClick={() => setLightbox(null)}>
          <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightbox(null)}>
              <X size={24} />
            </button>
            <div className="lightbox-image">
              {getCover(lightbox)?.url ? (
                <img src={getCover(lightbox).url} alt={lightbox.title} loading="lazy" className="img-optimized" style={{ height: '400px', width: '100%' }} />
              ) : (
                <div className="gallery-placeholder" style={{ height: '400px' }}>
                  <Image size={64} />
                </div>
              )}
            </div>
            <div className="lightbox-info">
              <h3>{lightbox.title}</h3>
              <p>{lightbox.description}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
