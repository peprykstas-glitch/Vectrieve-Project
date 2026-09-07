// app/(auth)/forgot-password/page.tsx
import { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import Link from 'next/link';
import { ArrowLeft, Hexagon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Reset Password | Neurach AI',
  description: 'Request a password reset link for your Neurach workspace.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden py-12 px-4 transition-colors">
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"
      />

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        {/* Back to login */}
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-8 self-start transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </Link>

        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl font-bold tracking-tight text-foreground font-sans">
            Neurach
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 tracking-widest uppercase">
            AI
          </span>
        </div>

        <ForgotPasswordForm />

        <p className="mt-8 text-xs text-muted-foreground text-center text-balance">
          Need assistance? Please contact your organization&apos;s system administrator.
        </p>
      </div>
    </div>
  );
}
