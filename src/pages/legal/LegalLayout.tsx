import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEOFooter from "@/components/SEOFooter";

interface Props {
  title: string;
  description: string;
  path: string;
  updated: string;
  children: React.ReactNode;
}

const LegalLayout = ({ title, description, path, updated, children }: Props) => (
  <>
    <Helmet>
      <title>{title} | GD Buddy</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={`https://gdbuddy.lovable.app${path}`} />
      <meta property="og:title" content={`${title} | GD Buddy`} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={`https://gdbuddy.lovable.app${path}`} />
      <meta property="og:type" content="article" />
    </Helmet>
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 md:px-6 py-10 md:py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <header className="mb-10">
          <h1 className="font-display text-4xl md:text-5xl mb-3">{title}</h1>
          <p className="text-sm text-muted-foreground">Last updated: {updated}</p>
          <p className="mt-4 text-base text-muted-foreground italic-accent">{description}</p>
        </header>
        <article className="prose-legal space-y-6 text-[15px] leading-relaxed text-foreground/90">
          {children}
        </article>
      </div>
      <SEOFooter />
    </main>
  </>
);

export default LegalLayout;
