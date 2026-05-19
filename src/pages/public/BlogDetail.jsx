import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import { usePublicBlogPostQuery } from '../../hooks/public/usePublicQueries';
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

export default function BlogDetail() {
  const { id } = useParams();
  const { data: post, isPending, isLoading } = usePublicBlogPostQuery(id);

  if ((isPending || isLoading) && !post) {
    return (
      <div className="page-wrapper">
        <div className="container section text-center">
          <h2>Memuat artikel...</h2>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page-wrapper">
        <div className="container section text-center">
          <h2>Artikel tidak ditemukan</h2>
          <Link to="/blog" className="btn btn-primary" style={{ marginTop: '16px' }}>
            <ArrowLeft size={16} /> Kembali ke Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <SEO title={post.title} description={post.summary} />
      <div className="page-hero">
        <div className="container">
          <Link to="/blog" className="blog-back-link"><ArrowLeft size={16} /> Kembali ke Blog</Link>
          <h1>{post.title}</h1>
          <div className="blog-detail-meta">
            <span><Calendar size={14} /> {formatDate(post.publishedAt || post.date)}</span>
            <span><User size={14} /> {post.author}</span>
            <span><Tag size={14} /> {post.category}</span>
          </div>
        </div>
      </div>
      <div className="container section">
        <div className="blog-detail-content">
          <article className="blog-article">
            <p>{post.content}</p>
          </article>
        </div>
      </div>
    </div>
  );
}
