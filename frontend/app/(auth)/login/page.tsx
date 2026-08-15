// app/(auth)/login/page.tsx
import { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { Hexagon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sign In | Vectrieve AI',
  description: 'Securely authenticate to access your advanced RAG environment.',
};

export default function LoginPage() {
  return (
    // The main container establishes the absolute #0a0a0a dark mode and prevents scrolling
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] selection:bg-white/20 relative overflow-hidden">
      
      {/* Subtle background gradient to provide immense atmospheric depth without clutter */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #333 0%, transparent 50%)' }} 
      />
      
      <div className="z-10 w-full max-w-md px-6 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Vectrieve AI" className="h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(0,212,255,0.25)]" />
        </div>
        
        {/* Isolation of complex state logic into the Client Component */}
        <LoginForm />
        
        <p className="mt-8 text-sm text-zinc-500 text-center text-balance">
          By authenticating, you acknowledge and accept our{' '}
          <a href="/terms" className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors">
            Enterprise Terms of Service
          </a>{' '}
          and comprehensive{' '}
          <a href="/privacy" className="text-zinc-400 hover:text-white underline underline-offset-2 transition-colors">
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
}