import { Link } from "react-router-dom";
import PactpayLogo from "@/components/PactpayLogo";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
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
            Back Home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 font-medium mb-8 pb-6 border-b border-[#1e3a5f]">
          Effective date: April 27, 2026 &nbsp;·&nbsp; Last updated: April 27, 2026
        </p>

        <div className="bg-[#132338] border-l-4 border-primary border-r border-t border-b border-[#1e3a5f] rounded-r-xl p-6 mb-10 shadow-xl shadow-black/20">
          <p className="text-[#e2e8f0] leading-relaxed">
            Please read these Terms of Service carefully before using Pactpay. By creating an account or using our platform, you agree to be bound by these terms.
          </p>
        </div>

        <div className="prose prose-invert prose-slate max-w-none space-y-10">
          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">01.</span> About Pactpay
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>
                Pactpay is an escrow-protected contract platform that enables freelancers and clients to formalize work agreements and securely manage payments. Pactpay acts as a neutral third party that holds funds in escrow and releases them based on agreed milestones.
              </p>
              <p>
                Pactpay does not facilitate the introduction of clients and freelancers. Users bring their own working relationships to the platform.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">02.</span> Eligibility
            </h2>
            <p className="text-slate-400 mb-4">To use Pactpay you must:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Be at least 18 years of age</li>
              <li>Have the legal capacity to enter into binding contracts in your jurisdiction</li>
              <li>Provide accurate and truthful information during registration and KYC verification</li>
              <li>Not be prohibited from using financial services under applicable law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">03.</span> Account Registration & KYC
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>To access the full features of Pactpay, you must complete our Know Your Customer (KYC) verification process. This includes providing:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Your full legal name and date of birth</li>
                <li>A valid government-issued photo ID (National ID, Passport, or Driver's License)</li>
                <li>A selfie holding your ID document</li>
                <li>Your country of residence and contact information</li>
              </ul>
              <p>
                By submitting KYC documents, you confirm that all information provided is accurate, genuine and belongs to you. Submitting false or fraudulent documents will result in immediate account termination and may be reported to relevant authorities.
              </p>
              <p>
                KYC documents are reviewed by authorised Pactpay administrators only. Your documents will not be shared with any third parties except where required by law.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">04.</span> Platform Fee
            </h2>
            <p className="text-slate-400 mb-4">
              Pactpay charges a platform fee of <strong className="text-white">2% of the total contract value</strong>. This fee is:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Deducted at the point of funding a contract from the client's wallet</li>
              <li>Non-refundable once the contract has been funded</li>
              <li>Clearly displayed to the client before they confirm funding</li>
              <li>Not charged on wallet top-ups or withdrawals</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">05.</span> Escrow & Payments
            </h2>
            <div className="space-y-6 text-slate-400 leading-relaxed">
              <div>
                <p className="text-white font-semibold mb-2">When a client funds a contract, the client agrees that:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Funds will only be released upon explicit milestone approval</li>
                  <li>If a milestone is not reviewed within 7 days of submission, funds will be automatically released to the freelancer</li>
                  <li>Funded contracts cannot be cancelled without mutual agreement or dispute resolution</li>
                </ul>
              </div>
              <div>
                <p className="text-white font-semibold mb-2">Freelancers acknowledge that:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Payment is only released after client approval or auto-release timeout</li>
                  <li>Disputed milestones will be frozen pending resolution</li>
                  <li>Released funds are credited to their Pactpay wallet and can be withdrawn</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">06.</span> Disputes
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>Either party may raise a dispute on a milestone. When a dispute is raised:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>The affected funds are frozen immediately</li>
                <li>Both parties must submit evidence within 5 business days</li>
                <li>Pactpay administrators will review all evidence and make a final decision</li>
                <li>Pactpay's decision on dispute resolution is final and binding</li>
                <li>Pactpay reserves the right to split funds proportionally based on evidence</li>
              </ul>
              <p>Pactpay is not liable for the quality, legality, or completion of work performed off-platform.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">07.</span> Prohibited Activities
            </h2>
            <p className="text-slate-400 mb-4">You must not use Pactpay for:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Any illegal transactions or services</li>
              <li>Money laundering or fraud</li>
              <li>Impersonating another person or entity</li>
              <li>Creating contracts for prohibited goods or services</li>
              <li>Attempting to circumvent the escrow process</li>
              <li>Harassing or threatening other users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">08.</span> Account Suspension & Termination
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>Pactpay reserves the right to suspend or terminate any account that:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Violates these Terms of Service</li>
                <li>Submits fraudulent KYC documents</li>
                <li>Engages in suspicious or fraudulent transaction activity</li>
                <li>Receives multiple legitimate disputes</li>
              </ul>
              <p>Upon termination, any funds held in escrow will be handled in accordance with the dispute resolution process. Wallet balances may be withdrawn subject to verification.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">09.</span> Limitation of Liability
            </h2>
            <div className="space-y-4 text-slate-400 leading-relaxed">
              <p>Pactpay provides a technology platform and escrow service only. We are not responsible for:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>The quality or delivery of work performed between users</li>
                <li>Agreements made between users outside of the Pactpay platform</li>
                <li>Losses arising from user error, fraud by the other party, or force majeure events</li>
              </ul>
              <p>Pactpay's total liability to any user shall not exceed the total fees paid to Pactpay in the 3 months preceding the claim.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">10.</span> Changes to Terms
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Pactpay may update these Terms of Service from time to time. Users will be notified of significant changes via email. Continued use of the platform after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">11.</span> Governing Law
            </h2>
            <p className="text-slate-400 leading-relaxed">
              These Terms of Service are governed by applicable law. Any disputes arising from these terms shall be resolved through binding arbitration before resorting to litigation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
              <span className="opacity-50 font-mono text-sm">12.</span> Contact
            </h2>
            <p className="text-slate-400 leading-relaxed">
              For questions about these Terms of Service, contact us at <a href="mailto:legal@pactpay.app" className="text-primary hover:underline transition-all">legal@pactpay.app</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="text-center py-12 text-slate-600 border-t border-[#1e3a5f]">
        <div className="container mx-auto px-4">
          <p className="text-sm mb-4">
            &copy; 2026 Pactpay. All rights reserved.
          </p>
          <div className="flex justify-center gap-6">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-white cursor-default">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
