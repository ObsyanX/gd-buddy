import LegalLayout from "./LegalLayout";
import { Mail, Github, Linkedin, MessageSquare, MapPin, Clock } from "lucide-react";

const Contact = () => (
  <LegalLayout
    title="Contact Us"
    description="Get in touch with the GD Buddy team — support, partnerships, press, feedback and account requests."
    path="/contact"
    updated="16 July 2026"
  >
    <section>
      <p>Whether you have a question about a feature, need help with your account, want to
        report a bug, or you're a college placement cell exploring a partnership — we're happy
        to hear from you.</p>
    </section>

    <section className="grid sm:grid-cols-2 gap-4 not-prose">
      <a href="mailto:duttasayan947595@gmail.com" className="glass rounded-2xl p-5 hover:shadow-copper transition-shadow">
        <Mail className="w-5 h-5 text-primary-glow mb-3" />
        <div className="font-display text-lg mb-1">Email</div>
        <div className="text-sm text-muted-foreground">duttasayan947595@gmail.com</div>
      </a>
      <a href="https://www.linkedin.com/in/sayan-dutta-exceptional98/" target="_blank" rel="noopener noreferrer" className="glass rounded-2xl p-5 hover:shadow-copper transition-shadow">
        <Linkedin className="w-5 h-5 text-primary-glow mb-3" />
        <div className="font-display text-lg mb-1">LinkedIn</div>
        <div className="text-sm text-muted-foreground">sayan-dutta-exceptional98</div>
      </a>
      <a href="https://github.com/ObsyanX" target="_blank" rel="noopener noreferrer" className="glass rounded-2xl p-5 hover:shadow-copper transition-shadow">
        <Github className="w-5 h-5 text-primary-glow mb-3" />
        <div className="font-display text-lg mb-1">GitHub</div>
        <div className="text-sm text-muted-foreground">github.com/ObsyanX</div>
      </a>
      <div className="glass rounded-2xl p-5">
        <MessageSquare className="w-5 h-5 text-primary-glow mb-3" />
        <div className="font-display text-lg mb-1">In-app support</div>
        <div className="text-sm text-muted-foreground">Settings → Help & feedback</div>
      </div>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">Response times</h2>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>We reply to most emails within 2 business days.</span>
      </div>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">Where we're based</h2>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span>Kolkata, West Bengal, India</span>
      </div>
    </section>

    <section>
      <h2 className="font-display text-2xl mt-8 mb-3">Data requests</h2>
      <p>For access, export or deletion of your personal data, email us with the subject
        line “Data request — &lt;your account email&gt;”. See the
        <a href="/privacy" className="text-primary-glow underline"> Privacy Policy</a> for details.</p>
    </section>
  </LegalLayout>
);

export default Contact;
