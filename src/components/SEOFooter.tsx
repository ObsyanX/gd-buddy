import { Link } from "react-router-dom";
import { Github, Linkedin, Mail, MessageSquare } from "lucide-react";

const SEOFooter = () => (
  <footer className="relative z-10 py-12 px-4 md:px-6 mt-16" role="contentinfo">
    <div className="container mx-auto">
      <div className="glass rounded-[2rem] p-8 md:p-12">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-copper flex items-center justify-center shadow-copper">
                <MessageSquare className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-xl">GD Buddy</span>
            </Link>
            <p className="text-sm text-muted-foreground italic-accent">
              Rehearsal, refined.
            </p>
          </div>

          <nav aria-label="Footer navigation" className="md:col-span-3 grid grid-cols-2 sm:grid-cols-5 gap-6">
            <div>
              <h3 className="text-micro text-primary-glow mb-3">Practice</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/home/practice" className="text-muted-foreground story-link hover:text-foreground">Solo Practice</Link></li>
                <li><Link to="/home/multiplayer" className="text-muted-foreground story-link hover:text-foreground">Multiplayer</Link></li>
                <li><Link to="/home/drills" className="text-muted-foreground story-link hover:text-foreground">Skill Drills</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-micro text-primary-glow mb-3">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/gd-topics-for-placements" className="text-muted-foreground story-link hover:text-foreground">GD Topics</Link></li>
                <li><Link to="/how-to-crack-group-discussion" className="text-muted-foreground story-link hover:text-foreground">How to Crack GD</Link></li>
                <li><Link to="/communication-skills-for-gd" className="text-muted-foreground story-link hover:text-foreground">Communication</Link></li>
                <li><Link to="/common-gd-mistakes" className="text-muted-foreground story-link hover:text-foreground">Common Mistakes</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-micro text-primary-glow mb-3">Learn</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/group-discussion-preparation-guide" className="text-muted-foreground story-link hover:text-foreground">Preparation Guide</Link></li>
                <li><Link to="/ai-gd-simulator" className="text-muted-foreground story-link hover:text-foreground">AI Simulator</Link></li>
                <li><Link to="/home/dashboard" className="text-muted-foreground story-link hover:text-foreground">Dashboard</Link></li>
                <li><Link to="/about" className="text-muted-foreground story-link hover:text-foreground">About</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-micro text-primary-glow mb-3">Account</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/home/profile" className="text-muted-foreground story-link hover:text-foreground">Profile</Link></li>
                <li><Link to="/home/settings" className="text-muted-foreground story-link hover:text-foreground">Settings</Link></li>
                <li><Link to="/contact" className="text-muted-foreground story-link hover:text-foreground">Contact</Link></li>
              </ul>
              <div className="flex gap-3 mt-4">
                <a href="https://github.com/ObsyanX" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="w-9 h-9 rounded-full glass-subtle flex items-center justify-center text-muted-foreground hover:text-primary-glow transition-colors">
                  <Github className="w-4 h-4" />
                </a>
                <a href="https://www.linkedin.com/in/sayan-dutta-exceptional98/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="w-9 h-9 rounded-full glass-subtle flex items-center justify-center text-muted-foreground hover:text-primary-glow transition-colors">
                  <Linkedin className="w-4 h-4" />
                </a>
                <a href="mailto:duttasayan947595@gmail.com" aria-label="Email" className="w-9 h-9 rounded-full glass-subtle flex items-center justify-center text-muted-foreground hover:text-primary-glow transition-colors">
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-micro text-primary-glow mb-3">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="text-muted-foreground story-link hover:text-foreground">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-muted-foreground story-link hover:text-foreground">Terms of Service</Link></li>
                <li><Link to="/disclaimer" className="text-muted-foreground story-link hover:text-foreground">Disclaimer</Link></li>
                <li><Link to="/contact" className="text-muted-foreground story-link hover:text-foreground">Contact Us</Link></li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="pt-6 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-micro text-muted-foreground">© {new Date().getFullYear()} GD Buddy · Rehearsal, refined.</p>
          <p className="text-micro text-muted-foreground italic-accent">Editorial group discussion practice.</p>
        </div>
      </div>
    </div>
  </footer>
);

export default SEOFooter;
