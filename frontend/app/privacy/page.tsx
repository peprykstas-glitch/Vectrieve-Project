// app/privacy/page.tsx
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Server, HardDrive, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy & Data Security | Neurach',
  description: 'Enterprise Privacy Policy, GDPR Compliance, and Zero-Training Guarantees for Neurach AI.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen w-full bg-[#08080a] text-zinc-300 selection:bg-white/20 relative overflow-y-auto pb-20">
      {/* Subtle background gradient */}
      <div 
        className="absolute top-0 inset-x-0 h-[600px] z-0 opacity-25 pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #059669 0%, transparent 70%)' }} 
      />

      <div className="z-10 max-w-4xl mx-auto px-6 pt-16 relative">
        <Link href="/landing" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-10 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Overview
        </Link>

        <div className="flex items-center gap-3 mb-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="Neurach" className="h-9 w-9 object-contain drop-shadow-[0_0_12px_rgba(0,212,255,0.4)]" />
          <div className="flex items-center gap-2 font-bold tracking-tight">
            <span className="text-2xl font-bold tracking-tight text-white">Neurach</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">PRIVACY</span>
          </div>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Privacy & Data Governance Policy</h1>
        <p className="text-zinc-500 text-sm mb-10">Last Updated: August 20, 2026 · Compliant with GDPR, HIPAA, and Enterprise Zero-Retention Standards</p>

        <div className="space-y-10 text-zinc-300 text-sm leading-relaxed border-t border-white/10 pt-8">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              1. Fundamental Privacy Philosophy
            </h2>
            <p>
              Neurach is engineered from the ground up for strict confidentiality. We operate on a zero-knowledge principle: your documents, financial reports, legal contracts, and audio transcripts are processed exclusively within isolated tenant boundaries.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-cyan-400" />
              2. Absolute Zero Model Training Guarantee
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                <div className="text-white font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  No Public AI Training
                </div>
                <p className="text-xs text-zinc-400">
                  Neither Neurach nor upstream LLM providers (e.g. Groq Cloud LPU) store or use your queries, document chunks, or responses for model training.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                <div className="text-white font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Stateless API Inference
                </div>
                <p className="text-xs text-zinc-400">
                  Data sent to inference engines is retained only for the duration of the streaming response (sub-second) and purged immediately.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              3. Data Encryption & Storage Architecture
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li><strong>In-Transit Encryption:</strong> All client-to-server and server-to-engine traffic is encrypted with TLS 1.3.</li>
              <li><strong>Dense Vector Embeddings:</strong> Text is transformed into dense numeric vectors using local FastEmbed ONNX BGE models and stored in isolated Qdrant collections.</li>
              <li><strong>Password Hashing:</strong> Credentials are encrypted using Argon2id with salted rounds. Plaintext passwords are never accessible to administrators.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-amber-400" />
              4. GDPR User Rights & Right to Erasure
            </h2>
            <p>
              Under GDPR, you have the absolute right to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
              <li>Export all documents and chat session history in standard JSON/PDF formats.</li>
              <li>Instantly delete any document or entire Knowledge Space, which permanently purges all associated text chunks, embeddings, and telemetry records.</li>
              <li>Request full account deletion at any time via the Admin workspace settings.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
