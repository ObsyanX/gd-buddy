import LegalLayout from "./LegalLayout";

const TermsOfService = () => (
  <LegalLayout
    title="Terms of Service"
    description="The rules that govern your access to and use of GD Buddy — accounts, acceptable use, AI content, payments, liability and termination."
    path="/terms"
    updated="16 July 2026"
  >
    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">1. Acceptance</h2>
      <p>By creating an account or using GD Buddy you agree to these Terms of Service and to our
        <a href="/privacy" className="text-primary-glow underline"> Privacy Policy</a>. If you do
        not agree, do not use the service.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">2. Eligibility</h2>
      <p>You must be at least 13 years old, or the minimum digital-consent age in your country,
        whichever is higher. You are responsible for keeping your login credentials secure.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">3. Acceptable use</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Do not use GD Buddy to harass, defame or impersonate others.</li>
        <li>Do not upload illegal, hateful, sexually explicit or violent content.</li>
        <li>Do not attempt to reverse engineer, scrape at scale, or overload the platform.</li>
        <li>Do not use the AI features to generate content that violates applicable law.</li>
      </ul>
      <p>We may suspend or terminate accounts that breach these rules.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">4. AI-generated content</h2>
      <p>GD Buddy uses large language models to simulate participants and grade transcripts.
        Outputs may contain inaccuracies. You are responsible for reviewing AI feedback before
        relying on it for placement or interview preparation. AI outputs are provided
        “as is” without warranty.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">5. Your content</h2>
      <p>You retain ownership of transcripts and recordings you create. You grant GD Buddy a
        limited licence to store, process and display that content for the purpose of operating
        the service and generating your feedback reports.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">6. Free and paid plans</h2>
      <p>Core features are free. If we introduce paid tiers, pricing and billing terms will be
        presented in-app before you subscribe. Statutory refund rights apply.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">7. Availability</h2>
      <p>We aim for high availability but do not guarantee uninterrupted service. Scheduled
        maintenance and third-party outages may cause downtime.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">8. Limitation of liability</h2>
      <p>To the extent permitted by law, GD Buddy and its operators shall not be liable for any
        indirect, incidental, or consequential damages arising out of your use of the service.
        Our total liability shall not exceed the amount you paid us in the twelve months prior
        to the claim, or ₹1,000, whichever is greater.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">9. Termination</h2>
      <p>You may close your account any time from Settings. We may suspend accounts for breach
        of these terms with reasonable notice unless immediate action is required.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">10. Governing law</h2>
      <p>These terms are governed by the laws of India. Disputes will be handled by the courts
        of Kolkata, West Bengal, unless mandatory local law provides otherwise.</p>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">11. Contact</h2>
      <p>Reach us at <a href="mailto:duttasayan947595@gmail.com" className="text-primary-glow underline">duttasayan947595@gmail.com</a>.</p>
    </section>
  </LegalLayout>
);

export default TermsOfService;
