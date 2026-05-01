import { Link } from "react-router-dom";
import PactpayLogo from "@/components/PactpayLogo";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

const Terms = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#0F1B2D] text-[#e2e8f0] selection:bg-primary/30">
      <header className="border-b border-[#1e3a5f] bg-[#0F1B2D]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <PactpayLogo size="sm" />
          </Link>
          <Link 
            to="/" 
            className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("terms.backHome")}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">{t("terms.title")}</h1>
        <p className="text-sm text-slate-500 font-medium mb-8 pb-6 border-b border-[#1e3a5f]">
          {t("terms.effectiveDate")} &nbsp;·&nbsp; {t("terms.lastUpdated")}
        </p>

        <div className="bg-[#132338] border-l-4 border-primary border-r border-t border-b border-[#1e3a5f] rounded-r-xl p-6 mb-10 shadow-xl shadow-black/20">
          <p className="text-[#e2e8f0] leading-relaxed">
            {t("terms.intro")}
          </p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-10">
          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">01.</span> {t("terms.section1.title")}
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>{t("terms.section1.content1")}</p>
              <p>{t("terms.section1.content2")}</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">02.</span> {t("terms.section2.title")}
            </h2>
            <p className="text-slate-400 mb-4">{t("terms.section2.subtitle")}</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>{t("terms.section2.item1")}</li>
              <li>{t("terms.section2.item2")}</li>
              <li>{t("terms.section2.item3")}</li>
              <li>{t("terms.section2.item4")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">03.</span> {t("terms.section3.title")}
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>{t("terms.section3.content1")}</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>{t("terms.section3.item1")}</li>
                <li>{t("terms.section3.item2")}</li>
                <li>{t("terms.section3.item3")}</li>
                <li>{t("terms.section3.item4")}</li>
              </ul>
              <p>{t("terms.section3.content2")}</p>
              <p>{t("terms.section3.content3")}</p>
            </div>
          </section>

          {/* ... Rest of sections would follow similar pattern ... */}
        </div>
      </main>

      <footer className="text-center py-12 text-slate-600 border-t border-[#1e3a5f]">
        <div className="container mx-auto px-4">
          <p className="text-sm mb-4">
            &copy; 2026 Pactpay. {t("landing.footer.copyright")}
          </p>
          <div className="flex justify-center gap-6">
            <Link to="/privacy" className="hover:text-primary transition-colors">{t("landing.footer.privacy")}</Link>
            <Link to="/terms" className="text-white cursor-default">{t("landing.footer.terms")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
