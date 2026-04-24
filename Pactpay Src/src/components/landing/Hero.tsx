import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";
import PactpayLogo from "@/components/PactpayLogo";

const Hero = () => {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="container relative mx-auto px-4 text-center">
        <div className="mx-auto max-w-3xl animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Escrow-protected contracts for freelancers
          </div>

          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-foreground md:text-7xl flex flex-col items-center gap-4">
            <div className="flex justify-center mb-4">
              <PactpayLogo size="lg" />
            </div>
            <span>Your work. <span className="text-gradient">Protected.</span></span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Create a contract, lock the payment, release when the job is done.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button variant="hero" size="lg" className="text-base px-8 py-6" asChild>
              <Link to="/auth?mode=signup">
                Create a Contract
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6" asChild>
              <Link to="/auth">I have an invite link</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
