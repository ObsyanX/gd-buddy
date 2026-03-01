import { Link } from "react-router-dom";

const SEOFooter = () => (
  <footer className="border-t-4 border-border py-8 px-6" role="contentinfo">
    <div className="container mx-auto">
      <nav aria-label="Footer navigation" className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div>
          <h3 className="font-bold text-sm mb-2">PRACTICE</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/practice" className="hover:text-foreground transition-colors">Solo Practice</Link></li>
            <li><Link to="/multiplayer" className="hover:text-foreground transition-colors">Multiplayer</Link></li>
            <li><Link to="/drills" className="hover:text-foreground transition-colors">Skill Drills</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2">RESOURCES</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/gd-topics-for-placements" className="hover:text-foreground transition-colors">GD Topics</Link></li>
            <li><Link to="/how-to-crack-group-discussion" className="hover:text-foreground transition-colors">How to Crack GD</Link></li>
            <li><Link to="/communication-skills-for-gd" className="hover:text-foreground transition-colors">Communication Skills</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2">LEARN</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/common-gd-mistakes" className="hover:text-foreground transition-colors">Common Mistakes</Link></li>
            <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold text-sm mb-2">ACCOUNT</h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/profile" className="hover:text-foreground transition-colors">Profile</Link></li>
            <li><Link to="/settings" className="hover:text-foreground transition-colors">Settings</Link></li>
          </ul>
        </div>
      </nav>
      <p className="text-center text-sm text-muted-foreground font-mono">
        © {new Date().getFullYear()} GD BUDDY • AI-POWERED GROUP DISCUSSION PRACTICE
      </p>
    </div>
  </footer>
);

export default SEOFooter;
