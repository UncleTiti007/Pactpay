import { FileText, Lock, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICONS = [FileText, Lock, CheckCircle];

const HowItWorks = () => {
  const { t } = useTranslation();
  const steps = [
    { icon: ICONS[0], title: t("landing.howItWorks.step1Title"), description: t("landing.howItWorks.step1Desc") },
    { icon: ICONS[1], title: t("landing.howItWorks.step2Title"), description: t("landing.howItWorks.step2Desc") },
    { icon: ICONS[2], title: t("landing.howItWorks.step3Title"), description: t("landing.howItWorks.step3Desc") },
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">{t("landing.howItWorks.title")}</h2>
          <p className="text-muted-foreground text-lg">{t("landing.howItWorks.subtitle")}</p>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="group relative flex flex-col items-center text-center" style={{ animationDelay: `${index * 150}ms` }}>
              {index < steps.length - 1 && (
                <div className="absolute right-0 top-10 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-border to-transparent md:block" />
              )}
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-border/50 bg-card transition-colors group-hover:border-primary/50">
                <step.icon className="h-8 w-8 text-primary" />
              </div>
              <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
