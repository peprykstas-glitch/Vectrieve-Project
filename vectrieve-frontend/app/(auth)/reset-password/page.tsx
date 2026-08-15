// app/(auth)/reset-password/page.tsx
import { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import Link from 'next/link';
import { ArrowLeft, Hexagon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Set New Password | Vectrieve AI',
  description: 'Set a new secure password for your Vectrieve workspace.',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] selection:bg-white/20 relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #333 0%, transparent 50%)' }}
      />

      <div className="z-10 w-full max-w-md px-6 flex flex-col items-center">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-sm mb-10 self-start transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </Link>

        <div className="flex items-center gap-2 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Vectrieve AI" className="h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(0,212,255,0.25)]" />
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
}
