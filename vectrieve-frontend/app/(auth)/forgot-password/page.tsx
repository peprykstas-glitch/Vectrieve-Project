// app/(auth)/forgot-password/page.tsx
import { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import Link from 'next/link';
import { ArrowLeft, Hexagon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Reset Password | Vectrieve AI',
  description: 'Request a password reset link for your Vectrieve workspace.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] selection:bg-white/20 relative overflow-hidden">
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #333 0%, transparent 50%)' }}
      />

      <div className="z-10 w-full max-w-md px-6 flex flex-col items-center">
        {/* Back to login */}
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-sm mb-10 self-start transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <Hexagon className="w-8 h-8 text-white fill-white/10" strokeWidth={1.5} />
          <span className="text-2xl font-semibold tracking-tight text-white">Vectrieve</span>
        </div>

        <ForgotPasswordForm />

        <p className="mt-8 text-sm text-zinc-500 text-center text-balance">
          Need assistance? Please contact your organization&apos;s system administrator.
        </p>
      </div>
    </div>
  );
}
