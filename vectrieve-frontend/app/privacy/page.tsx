// app/privacy/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { BrainCircuit, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Vectrieve',
  description: 'Privacy Policy and data protection details for Vectrieve AI Knowledge Base.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-zinc-300 selection:bg-white/20 relative overflow-y-auto pb-20">
      
      {/* Subtle background gradient */}
      <div className="absolute top-0 inset-x-0 h-[500px] z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #333 0%, transparent 80%)' }} 
      />
      
      <div className="z-10 max-w-3xl mx-auto px-6 pt-16 relative">
        <Link href="/login" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm mb-10 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Sign In
        </Link>

        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <BrainCircuit className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">Vectrieve</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-8">Last updated: June 20, 2026</p>

        <div className="space-y-8 text-zinc-300 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">1. Introduction</h2>
            <p>
              Vectrieve ("we", "us", or "our") is designed from the ground up to protect your privacy and ensure secure document retrieval. We believe that your corporate data and personal knowledge bases should remain exclusively yours. This Privacy Policy details how we handle user accounts, metadata, and document indexing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">2. Local-First & Data Minimization</h2>
            <p>
              Vectrieve prioritizes local computations and tenant isolation:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li><strong>Local Neural Mode:</strong> When configured in local execution mode, document embedding, vector storage (via local Docker Qdrant), and LLM processing (via Ollama) occur entirely on your local machine. No data leaves your secure perimeter.</li>
              <li><strong>Cloud Compute Mode:</strong> If you opt for Cloud mode, documents are securely transmitted to highly compliant vector stores and AI providers (such as Groq) utilizing enterprise TLS encryption.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">3. Data We Collect and Process</h2>
            <p>
              We limit our data collection to the absolute minimum required to operate the secure workspace:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li><strong>Account Credentials:</strong> Corporate email addresses and cryptographically hashed master passwords (using the Argon2id hashing algorithm).</li>
              <li><strong>Document Indexing:</strong> Uploaded PDF, TXT, and source code files. These files are parsed into vector chunks and stored in your isolated tenant DB instance.</li>
              <li><strong>Analytical Logs:</strong> Dynamic transaction logs (total query count, storage size, vector count) stored locally in your database instance for usage visualization.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">4. No AI Training Policy</h2>
            <p>
              We firmly believe in intellectual property protection. <strong>None of your uploaded documents, vector chunks, prompt histories, or AI responses are ever used to train public LLM models</strong> by us or our service partners. Under our Cloud API agreement, data is processed under zero-data-retention (ZDR) endpoints and deleted immediately after serving.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">5. Third-Party Integrations</h2>
            <p>
              When utilizing Cloud mode, we partner with the following services which maintain strict corporate compliance standards:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li><strong>Groq API:</strong> Used for fast cloud inference under strict Zero-Data-Retention policies.</li>
              <li><strong>Qdrant Cloud:</strong> For isolated cloud vector indexes (if local Docker is not preferred).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">6. Security Controls</h2>
            <p>
              We apply advanced cryptographic security controls to safeguard your data, including end-to-end TLS encryption, Argon2id master password protection, session isolation via HttpOnly cookies, and strict database query parameterization.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-white">7. Your Rights and Data Export</h2>
            <p>
              You maintain absolute control over your workspace. You can export your full chat session logs or completely terminate and delete your account, which instantly purges all associated documents and vector indexes from the DB.
            </p>
          </section>

          <section className="space-y-3 pt-6 border-t border-white/5">
            <h2 className="text-lg font-semibold text-white">Contact Us</h2>
            <p>
              If you have any questions regarding this Privacy Policy or Vectrieve security protocols, please reach out to your organization's IT department or email us at <span className="text-white">privacy@vectrieve.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
