import { Suspense } from 'react';
import { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Set New Password | Neurach AI',
  description: 'Set a new secure password for your Neurach workspace.',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden py-12 px-4 transition-colors">
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"
      />

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-8 self-start transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl font-bold tracking-tight text-foreground font-sans">
            Neurach
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 tracking-widest uppercase">
            AI
          </span>
        </div>

        <Suspense fallback={<div className="text-muted-foreground text-sm">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
