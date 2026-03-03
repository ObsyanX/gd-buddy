import { Helmet } from "react-helmet-async";

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  path?: string;
  noindex?: boolean;
  type?: string;
  image?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const BASE_TITLE = "GD Buddy";
const DEFAULT_DESC = "Practice group discussions with AI, get instant feedback, improve communication skills, and crack placement GD rounds.";
const DEFAULT_KEYWORDS = "group discussion practice, GD preparation, AI GD simulator, placement preparation tool, communication skills for GD";

const getCanonicalBase = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://gdbuddy.lovable.app";
};

const SEOHead = ({
  title,
  description = DEFAULT_DESC,
  keywords = DEFAULT_KEYWORDS,
  path = "",
  noindex = false,
  type = "website",
  image,
  jsonLd,
}: SEOHeadProps) => {
  const base = getCanonicalBase();
  const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} – AI Group Discussion Practice for Placements`;
  const canonicalUrl = `${base}${path}`;
  const ogImage = image || `${base}/og-image.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />

      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="GD Buddy" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd && (
        Array.isArray(jsonLd) && jsonLd.length > 0 && jsonLd[0]["@context"]
          ? jsonLd.map((ld, i) => (
              <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
            ))
          : <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
