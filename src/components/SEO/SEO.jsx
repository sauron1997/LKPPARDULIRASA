import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description }) {
  const siteName = 'LKP Parduli Rasa Komputer';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDesc = 'Lembaga Kursus & Pelatihan Komputer — Program kursus Microsoft Office, Desain Grafis, dan AutoCAD dengan biaya terjangkau.';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta name="robots" content="index, follow" />
    </Helmet>
  );
}
