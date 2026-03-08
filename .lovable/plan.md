## Problem

Google shows "Vercel" as the site name because:

1. **No `WebSite` schema** exists — only `SoftwareApplication` in `index.html`. Google uses the `WebSite` schema's `name` field to determine site name.
2. **Canonical base is inconsistent** — `SEOHead.tsx` defaults to `gdbuddy.lovable.app`, `index.html` hardcodes `gd-buddy.vercel.app`, and `GDTopicPage.tsx` defaults to `gd-buddy.vercel.app`. Mixed signals confuse Google.
3. **No `og:site_name**` in `index.html` (only in `SEOHead.tsx` which renders client-side).
4. **Missing global `WebSite` + `Organization` JSON-LD** that loads on every page in the static HTML.

## Plan

### 1. Add WebSite + Organization JSON-LD to `index.html`

Add two new JSON-LD blocks alongside the existing `SoftwareApplication` one. These load in static HTML before React hydrates, so crawlers always see them:

```json
{ "@context": "https://schema.org", "@type": "WebSite", "name": "GD Buddy", "alternateName": "GD Buddy AI", "url": "https://gd-buddy.vercel.app" }
```

```json
{ "@context": "https://schema.org", "@type": "Organization", "name": "GD Buddy", "url": "https://gd-buddy.vercel.app", "logo": "https://gd-buddy.vercel.app/og-image.png", "sameAs": ["https://github.com/...", "https://linkedin.com/..."] }
```

Also add `<meta property="og:site_name" content="GD Buddy">` to the static OG tags already in `index.html`.

### 2. Standardize canonical base URL to `gd-buddy.vercel.app`

Update `SEOHead.tsx` fallback from `gdbuddy.lovable.app` → `https://gd-buddy.vercel.app`.

### 3. Fix inconsistent fallback in `GDTopicPage.tsx`

Already uses `gd-buddy.vercel.app` — no change needed.

### 4. Update `Landing.tsx` Organization/WebApplication fallback URLs

Change fallback from `gdbuddy.lovable.app` → `https://gd-buddy.vercel.app`.

### 5. Update `About.tsx` fallback URL

Same fix: `gdbuddy.lovable.app` → `https://gd-buddy.vercel.app`.

### 6. Inject global WebSite JSON-LD via `SEOHead.tsx`

Add the `WebSite` schema as a default JSON-LD that renders on every page via `react-helmet-async`, reinforcing the static HTML version.

### Files Modified


| File                         | Change                                                     |
| ---------------------------- | ---------------------------------------------------------- |
| `index.html`                 | Add `WebSite` + `Organization` JSON-LD, add `og:site_name` |
| `src/components/SEOHead.tsx` | Fix fallback URL, inject global `WebSite` JSON-LD          |
| `src/pages/Landing.tsx`      | Fix fallback URLs                                          |
| `src/pages/About.tsx`        | Fix fallback URL                                           |


### 7. Standardize Page Title Format Across SEO Pages

Ensure all public SEO pages follow a consistent title structure so Google clearly associates the content with the GD Buddy brand.

Update titles to follow this format:

`<Page Topic> | GD Buddy`

Examples:

GD Topics for Placements 2025 | GD Buddy  
How to Crack Group Discussion | GD Buddy  
Common GD Mistakes | GD Buddy  
Communication Skills for GD | GD Buddy

Apply this pattern across all SEO content pages.

This helps Google reinforce the site identity.

---

### 8. Add WebSite `potentialAction` Search Schema

Enhance the `WebSite` JSON-LD with a `SearchAction`. This improves how Google understands the site structure and strengthens the site identity signal.

Update the `WebSite` schema to:

```json
{
 "@context": "https://schema.org",
 "@type": "WebSite",
 "name": "GD Buddy",
 "alternateName": "GD Buddy AI",
 "url": "https://gd-buddy.vercel.app",
 "potentialAction": {
   "@type": "SearchAction",
   "target": "https://gd-buddy.vercel.app/search?q={search_term_string}",
   "query-input": "required name=search_term_string"
 }
}

```

If a search page does not exist yet, it can still be safely included for SEO compatibility.

---

### 9. Ensure Robots and Sitemap Reference the Correct Domain

Verify that the following files use the same canonical base URL:

robots.txt  
sitemap.xml

Both should reference:

[https://gd-buddy.vercel.app](https://gd-buddy.vercel.app)

Example:

```
Sitemap: https://gd-buddy.vercel.app/sitemap.xml

```

Mixed domains can weaken Google’s site identification.

---

### 10. Add `site_name` Reinforcement via OpenGraph on All Pages

Ensure the following meta tag is included globally in `SEOHead.tsx` so every page outputs it:

```html
<meta property="og:site_name" content="GD Buddy" />

```

This helps crawlers and social platforms consistently identify the brand.

---

### 11. Request Re-Indexing After Deployment

After deploying the changes:

1. Open **Google Search Console**
2. Use **URL Inspection**
3. Request indexing for:

```
/  
/gd-topics-for-placements  
/how-to-crack-group-discussion  
/common-gd-mistakes

```

This accelerates Google updating the site name from **Vercel → GD Buddy**.

Expected update window: **24 hours – 7 days**.

