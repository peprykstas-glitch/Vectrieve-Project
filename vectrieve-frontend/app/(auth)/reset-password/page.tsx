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
          <Hexagon className="w-8 h-8 text-white fill-white/10" strokeWidth={1.5} />
          <span className="text-2xl font-semibold tracking-tight text-white">Vectrieve</span>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
}
