import PactpayLogo from "@/components/PactpayLogo";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border/50 py-8">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <PactpayLogo size="sm" />
          <span className="text-sm text-muted-foreground">{t("landing.footer.copyright")}</span>
        </div>
        <div className="flex gap-6">
          <a href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t("landing.footer.privacy")}
          </a>
          <a href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            {t("landing.footer.terms")}
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
