import { UserX, ShieldCheck, ListChecks } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICONS = [UserX, ShieldCheck, ListChecks];

const TrustSection = () => {
  const { t } = useTranslation();
  const cards = [
    { icon: ICONS[0], title: t("landing.trust.card1Title"), description: t("landing.trust.card1Desc") },
    { icon: ICONS[1], title: t("landing.trust.card2Title"), description: t("landing.trust.card2Desc") },
    { icon: ICONS[2], title: t("landing.trust.card3Title"), description: t("landing.trust.card3Desc") },
  ];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">{t("landing.trust.title")}</h2>
          <p className="text-lg text-muted-foreground">{t("landing.trust.subtitle")}</p>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((card, index) => (
            <div key={index} className="glass-card group p-6 transition-all hover:border-primary/30 hover:glow-primary">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{card.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
