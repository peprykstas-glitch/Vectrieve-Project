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
          {/* Subtle logo branding using Lucide React icons with low-opacity fills */}
          <Hexagon className="w-8 h-8 text-white fill-white/10" strokeWidth={1.5} />
          <span className="text-2xl font-semibold tracking-tight text-white">Vectrieve</span>
        </div>
        
        {/* Isolation of complex state logic into the Client Component */}
        <LoginForm />
        
        <p className="mt-8 text-sm text-zinc-500 text-center text-balance">
          By authenticating, you acknowledge and accept our Enterprise Terms of Service and comprehensive Privacy Policy.
        </p>
      </div>
    </div>
  );
}