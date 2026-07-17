import LegalLayout from "./LegalLayout";

const PrivacyPolicy = () => (
  <LegalLayout
    title="Privacy Policy"
    description="How GD Buddy collects, uses, stores and protects your personal information when you practice group discussions on our platform."
    path="/privacy"
    updated="16 July 2026"
  >
    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">1. Who we are</h2>
      <p>
        GD Buddy (“we”, “our”, “us”) is an AI-powered group discussion and interview
        preparation platform operated by the GD Buddy team. This Privacy Policy explains
        what personal data we collect from users of gdbuddy.lovable.app and gd-buddy.vercel.app,
        why we collect it, how we use it, and the rights you have over that data.
      </p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">2. Information we collect</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>Account data</strong> — name, email address, profile picture and authentication
          identifiers when you sign in with email or Google.</li>
        <li><strong>Session data</strong> — group discussion transcripts, audio you record for
          speech-to-text, per-message metadata, feedback scores and AI-generated evaluations.</li>
        <li><strong>Usage data</strong> — pages visited, features used, device type, browser,
          approximate location derived from IP, and performance metrics (LCP, INP, CLS) via
          anonymous Real User Monitoring.</li>
        <li><strong>Cookies</strong> — a small number of first-party cookies for authentication
          and preferences, plus Google AdSense cookies as described in section 6.</li>
      </ul>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">3. How we use your data</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Provide the core service — creating sessions, running AI participants, scoring transcripts.</li>
        <li>Generate personalised feedback, drills and article recommendations.</li>
        <li>Prevent abuse, moderate content and diagnose bugs.</li>
        <li>Send transactional emails (password reset, weekly digest if opted in).</li>
        <li>Measure aggregate product performance.</li>
      </ul>
      <p>We do not sell your personal data. We do not use your session transcripts to train third-party foundation models.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">4. Legal basis</h2>
      <p>We process personal data under the following legal bases: performance of the contract
        with you, your consent (for optional cookies and marketing), our legitimate interests
        (product improvement, security), and compliance with legal obligations.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">5. Data storage and security</h2>
      <p>Data is stored on managed cloud infrastructure with encryption at rest and in transit.
        Row-level security ensures each user can only read their own sessions. Access to
        administrative dashboards is restricted to authorised staff and audited.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">6. Advertising and third parties</h2>
      <p>We use <strong>Google AdSense</strong> to serve ads on some public pages. Google and its
        partners may use cookies to serve ads based on your prior visits to this or other
        websites. You can opt out of personalised advertising by visiting
        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary-glow underline"> Google Ads Settings</a>.</p>
      <p>Other processors we rely on: Supabase (database and auth), Google OAuth, Lovable AI /
        Groq (language model inference), ElevenLabs (optional text-to-speech), Google PageSpeed
        Insights (performance monitoring).</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">7. Your rights</h2>
      <p>You may request access, correction, export or deletion of your data at any time from
        <strong> Settings → Privacy</strong>, or by emailing <a href="mailto:duttasayan947595@gmail.com" className="text-primary-glow underline">duttasayan947595@gmail.com</a>.
        We respond within 30 days.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">8. Children</h2>
      <p>GD Buddy is intended for users aged 13 and above. We do not knowingly collect data from
        children under 13.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">9. Changes</h2>
      <p>We may update this policy. Material changes will be announced in-app at least 14 days
        before they take effect.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">10. Contact</h2>
      <p>Questions? Write to <a href="mailto:duttasayan947595@gmail.com" className="text-primary-glow underline">duttasayan947595@gmail.com</a>.</p>
    </section>
  </LegalLayout>
);

export default PrivacyPolicy;
