import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PactpayLogo from "@/components/PactpayLogo";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/">
          <PactpayLogo size="md" />
        </Link>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
          <Button variant="hero" size="default" asChild>
            <Link to="/auth?mode=signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
