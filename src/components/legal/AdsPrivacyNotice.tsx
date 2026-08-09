import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

/**
 * On-site advertising & privacy disclosure. Required reading for AdSense policy
 * review: it names third-party ad serving, cookie usage, EEA/UK consent and
 * links to the full policy documents from every page.
 */
export function AdsPrivacyNotice() {
  return (
    <section
      aria-labelledby="ads-privacy-heading"
      className="mt-8 rounded-2xl border border-border/60 bg-card/30 p-5 md:p-6 text-left"
    >
      <h2
        id="ads-privacy-heading"
        className="flex items-center gap-2 text-sm font-semibold tracking-tight"
      >
        <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
        Advertising &amp; Privacy
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        GD Buddy is free to use and is supported by advertising. Third-party vendors, including
        Google, use cookies to serve ads based on a user&apos;s prior visits to this or other
        websites. Google&apos;s use of advertising cookies enables it and its partners to serve ads
        based on your visits to GD Buddy and/or other sites on the internet. You may opt out of
        personalised advertising by visiting{" "}
        <a
          href="https://www.google.com/settings/ads"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Google Ads Settings
        </a>{" "}
        or{" "}
        <a
          href="https://www.aboutads.info/choices/"
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="underline underline-offset-2 hover:text-foreground"
        >
          aboutads.info
        </a>
        . Visitors in the EEA, UK and Switzerland are asked for consent before any advertising or
        analytics cookies are set, and that choice can be changed at any time from the cookie
        banner.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        We never sell personal data. Practice transcripts and feedback reports are visible only to
        the account that created them. Full details are in the documents below.
      </p>
      <nav aria-label="Compliance documents" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <Link to="/privacy" className="text-primary-glow underline underline-offset-2">
          Privacy Policy
        </Link>
        <Link to="/terms" className="text-primary-glow underline underline-offset-2">
          Terms of Service
        </Link>
        <Link to="/disclaimer" className="text-primary-glow underline underline-offset-2">
          Disclaimer
        </Link>
        <Link to="/contact" className="text-primary-glow underline underline-offset-2">
          Contact Us
        </Link>
        <Link to="/about" className="text-primary-glow underline underline-offset-2">
          About &amp; Editorial Policy
        </Link>
      </nav>
    </section>
  );
}

export default AdsPrivacyNotice;
