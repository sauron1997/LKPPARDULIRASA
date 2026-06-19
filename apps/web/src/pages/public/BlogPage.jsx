import { Link } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';
import { usePublicBlogPostsQuery } from '../../hooks/public/usePublicQueries';
import SEO from '../../components/SEO/SEO';
import './Pages.css';

function formatDate(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function BlogPage() {
  const { data: posts = [] } = usePublicBlogPostsQuery();

  return (
    <div className="page-wrapper">
      <SEO title="Blog" description="Artikel terbaru seputar kegiatan dan edukasi komputer dari LKP Parduli Rasa Komputer." />
      <div className="page-hero">
        <div className="container">
          <h1>Blog</h1>
          <p>Informasi dan artikel terbaru seputar kegiatan LKP Parduli Rasa</p>
        </div>
      </div>
      <div className="container section">
        {posts.length > 0 ? (
          <div className="blog-list-grid">
            {posts.map((post) => (
              <Link key={post.id} to={`/blog/${post.id}`} className="blog-list-card card">
                <div className="blog-list-image">
                  {post.image ? (
                    <img src={post.image} alt={post.title} loading="lazy" />
                  ) : (
                    <div className="blog-placeholder-img">
                      <FileText size={40} />
                    </div>
                  )}
                </div>
                <div className="card-body">
                  <div className="blog-list-meta">
                    <span className="badge badge-info">{post.category}</span>
                    <span className="blog-date">{formatDate(post.publishedAt || post.date)}</span>
                  </div>
                  <h3>{post.title}</h3>
                  <p>{post.summary}</p>
                  <span className="blog-read-more">
                    Baca Selengkapnya <ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="blog-empty-state">
            <FileText size={64} />
            <h2>Belum Ada Artikel</h2>
            <p>Artikel blog akan segera tersedia. Silakan kunjungi lagi nanti.</p>
          </div>
        )}
      </div>
    </div>
  );
}
