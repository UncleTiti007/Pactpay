const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-8">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
            <span className="text-xs font-bold text-primary-foreground">P</span>
          </div>
          <span className="text-sm text-muted-foreground">Pactpay © 2026</span>
        </div>
        <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          Privacy Policy
        </a>
      </div>
    </footer>
  );
};

export default Footer;
