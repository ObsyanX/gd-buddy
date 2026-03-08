import { Link } from "react-router-dom";
import { Github, Linkedin, Mail } from "lucide-react";

const SEOFooter = () => (
  <footer className="border-t-4 border-border py-8 px-6" role="contentinfo">
    <div className="container mx-auto">
      <nav aria-label="Footer navigation" className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div>
          <h3 className="font-bold text-sm mb-2">PRACTICE</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/home/practice" className="hover:text-foreground transition-colors">Solo Practice</Link></li>
            <li><Link to="/home/multiplayer" className="hover:text-foreground transition-colors">Multiplayer</Link></li>
            <li><Link to="/home/drills" className="hover:text-foreground transition-colors">Skill Drills</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2">RESOURCES</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/gd-topics-for-placements" className="hover:text-foreground transition-colors">GD Topics</Link></li>
            <li><Link to="/how-to-crack-group-discussion" className="hover:text-foreground transition-colors">How to Crack GD</Link></li>
            <li><Link to="/communication-skills-for-gd" className="hover:text-foreground transition-colors">Communication Skills</Link></li>
            <li><Link to="/common-gd-mistakes" className="hover:text-foreground transition-colors">Common GD Mistakes</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2">LEARN</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/group-discussion-preparation-guide" className="hover:text-foreground transition-colors">GD Preparation Guide</Link></li>
            <li><Link to="/ai-gd-simulator" className="hover:text-foreground transition-colors">AI GD Simulator</Link></li>
            <li><Link to="/home/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
            <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2">ACCOUNT</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/home/profile" className="hover:text-foreground transition-colors">Profile</Link></li>
            <li><Link to="/home/settings" className="hover:text-foreground transition-colors">Settings</Link></li>
          </ul>
          <div className="flex gap-3 mt-4">
            <a href="https://github.com/ObsyanX" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://www.linkedin.com/in/sayan-dutta-exceptional98/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="text-muted-foreground hover:text-foreground transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
<a 
  href="mailto:duttasayan947595@gmail.com" 
  target="_blank" 
  rel="noopener noreferrer" 
  aria-label="Email"
  className="text-muted-foreground hover:text-foreground transition-colors"
>
  <Mail className="w-5 h-5" />
</a>
          </div>
        </div>
      </nav>
      <p className="text-center text-sm text-muted-foreground font-mono">
        © {new Date().getFullYear()} GD BUDDY • AI-POWERED GROUP DISCUSSION PRACTICE
      </p>
    </div>
  </footer>
);

export default SEOFooter;
