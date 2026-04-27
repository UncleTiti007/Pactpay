import PactpayLogo from "@/components/PactpayLogo";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-8">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <PactpayLogo size="sm" />
          <span className="text-sm text-muted-foreground">Pactpay © 2026</span>
        </div>
        <div className="flex gap-6">
          <a href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Privacy Policy
          </a>
          <a href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
