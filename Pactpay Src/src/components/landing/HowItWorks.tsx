import { FileText, Lock, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Create & Invite",
    description: "Create a contract and invite your client or freelancer with a simple link.",
  },
  {
    icon: Lock,
    title: "Deposit into Escrow",
    description: "Client deposits the full amount into escrow. Funds are locked and protected.",
  },
  {
    icon: CheckCircle,
    title: "Release by Milestone",
    description: "Funds release milestone by milestone as work is approved by the client.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
            How it works
          </h2>
          <p className="text-muted-foreground text-lg">Three simple steps to protect every deal.</p>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group relative flex flex-col items-center text-center"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Connector line */}
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
