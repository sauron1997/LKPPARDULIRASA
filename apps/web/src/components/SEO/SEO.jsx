import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'LKP Parduli Rasa Komputer';
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://pardulirasa.id';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_DESC = 'Lembaga Kursus & Pelatihan Komputer — Program kursus Microsoft Office, Desain Grafis, dan AutoCAD dengan biaya terjangkau.';

/**
 * SEO Component - Enhanced with full Open Graph, Twitter Card, and JSON-LD support.
 * 
 * @param {string} [title] - Page title (appended to site name)
 * @param {string} [description] - Meta description
 * @param {string} [image] - Social sharing image URL (defaults to /og-image.jpg)
 * @param {string} [canonical] - Canonical URL (defaults to SITE_URL)
 * @param {string} [type] - OG type, defaults to 'website' (use 'article' for blog posts)
 * @param {string} [jsonLd] - JSON-LD structured data object (optional)
 */
export default function SEO({
  title,
  description,
  image,
  canonical,
  type = 'website',
  jsonLd,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const desc = description || DEFAULT_DESC;
  const ogImage = image || DEFAULT_IMAGE;
  const canonicalUrl = canonical || SITE_URL;

  return (
    <Helmet>
      {/* Document Title */}
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="id_ID" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />

      {/* Robots */}
      <meta name="robots" content="index, follow" />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

/**
 * Organization JSON-LD schema — add to root layout or homepage.
 */
export const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: SITE_NAME,
  description: DEFAULT_DESC,
  url: SITE_URL,
  areaServed: {
    '@type': 'Country',
    name: 'Indonesia',
  },
};
