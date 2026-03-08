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
const DEFAULT_KEYWORDS = "group discussion buddy, group discussion practice, GD practice online, AI group discussion practice, GD simulator for placements, group discussion preparation, GD preparation, AI GD simulator, placement preparation tool, communication skills for GD, group discussion simulator";

const getCanonicalBase = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://gd-buddy.vercel.app";
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

  const globalWebSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GD Buddy",
    alternateName: ["Group Discussion Buddy", "GD Buddy AI", "AI Group Discussion Practice Tool", "Group Discussion Simulator", "GD Practice Platform"],
    url: "https://gd-buddy.vercel.app",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://gd-buddy.vercel.app/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

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

      <script type="application/ld+json">{JSON.stringify(globalWebSiteJsonLd)}</script>

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
