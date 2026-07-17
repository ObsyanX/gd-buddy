import LegalLayout from "./LegalLayout";

const Disclaimer = () => (
  <LegalLayout
    title="Disclaimer"
    description="Important information about the accuracy of AI feedback, editorial content, third-party links and advertising shown on GD Buddy."
    path="/disclaimer"
    updated="16 July 2026"
  >
    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">Educational purpose</h2>
      <p>GD Buddy is an educational practice tool. Feedback, scores and drills are designed
        to help you rehearse group discussions and interviews. They are not a substitute for
        professional coaching, career counselling, or an official placement outcome. Nothing on
        this site should be construed as a guarantee of employment or admission.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">AI accuracy</h2>
      <p>Simulated participants, transcripts and evaluations are produced by large language
        models. They may contain factual errors, hallucinations, biased phrasing or outdated
        information. Always cross-check important claims against authoritative sources.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">Editorial content</h2>
      <p>Articles on the <a href="/blog" className="text-primary-glow underline">blog</a> and
        the practice guides are written to reflect commonly accepted advice for Indian campus
        placement group discussions. They are opinion pieces, not academic citations.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">Third-party links</h2>
      <p>We link to third-party websites, tools and papers for your convenience. GD Buddy does
        not endorse their content and is not responsible for their practices.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">Advertising</h2>
      <p>Some pages display advertisements served by Google AdSense and other partners. Ads are
        clearly labelled. GD Buddy does not endorse advertised products and does not verify
        advertiser claims.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">Contact</h2>
      <p>Questions about this disclaimer? Email
        <a href="mailto:duttasayan947595@gmail.com" className="text-primary-glow underline"> duttasayan947595@gmail.com</a>.</p>
    </section>
  </LegalLayout>
);

export default Disclaimer;
