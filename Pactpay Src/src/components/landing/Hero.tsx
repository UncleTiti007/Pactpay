import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight } from "lucide-react";
import PactpayLogo from "@/components/PactpayLogo";
import { useTranslation } from "react-i18next";

const Hero = () => {
  const { t } = useTranslation();
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-16">
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="container relative mx-auto px-4 text-center">
        <div className="mx-auto max-w-3xl animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            {t("landing.hero.badge")}
          </div>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-7xl flex flex-col items-center gap-4 px-4">
            <div className="flex justify-center mb-4">
              <PactpayLogo size="lg" />
            </div>
            <span>{t("landing.hero.headline")} <span className="text-gradient">{t("landing.hero.headlineAccent")}</span></span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-muted-foreground md:text-xl px-4">
            {t("landing.hero.subheadline")}
          </p>

          <div className="flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center px-4 w-full max-w-md mx-auto sm:max-w-none">
            <Button variant="hero" size="lg" className="text-base px-8 py-6 w-full sm:w-auto" asChild>
              <Link to="/auth?mode=signup">
                {t("landing.hero.createContract")}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" className="text-base px-8 py-6 w-full sm:w-auto" asChild>
              <Link to="/auth">{t("landing.hero.haveInvite")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
