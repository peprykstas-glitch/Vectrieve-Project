// app/(auth)/login/page.tsx
import { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { Hexagon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign In | Neurach AI',
  description: 'Securely authenticate to access your advanced RAG environment.',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden py-12 px-4 transition-colors">
      
      {/* Soft atmospheric ambient glow */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" 
      />
      
      <div className="z-10 w-full max-w-md flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl font-bold tracking-tight text-foreground font-sans">
            Neurach
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 tracking-widest uppercase">
            AI
          </span>
        </div>
        
        {/* Isolation of complex state logic into the Client Component */}
        <LoginForm />
        
        <p className="mt-8 text-xs text-muted-foreground text-center text-balance leading-relaxed">
          By authenticating, you acknowledge and accept our{' '}
          <a href="/terms" className="text-foreground/80 hover:text-foreground underline underline-offset-2 transition-colors">
            Enterprise Terms of Service
          </a>{' '}
          and comprehensive{' '}
          <a href="/privacy" className="text-foreground/80 hover:text-foreground underline underline-offset-2 transition-colors">
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
}