import { UserX, ShieldCheck, ListChecks } from "lucide-react";

const cards = [
  {
    icon: UserX,
    title: "No more ghosting",
    description: "Contracts are binding. Both parties commit before work begins.",
  },
  {
    icon: ShieldCheck,
    title: "No upfront risk",
    description: "Funds sit safely in escrow until milestones are approved.",
  },
  {
    icon: ListChecks,
    title: "Your terms, your checklist",
    description: "Define milestones, deliverables, and deadlines that work for both sides.",
  },
];

const TrustSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            Built on trust
          </h2>
          <p className="text-lg text-muted-foreground">Why freelancers and clients choose Pactpay.</p>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
          {cards.map((card, index) => (
            <div
              key={index}
              className="glass-card group p-6 transition-all hover:border-primary/30 hover:glow-primary"
            >
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
