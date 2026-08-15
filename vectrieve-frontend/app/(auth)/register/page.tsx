// app/(auth)/register/page.tsx
import { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Hexagon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Register | Vectrieve AI',
  description: 'Provision your secure Enterprise RAG workspace.',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0a0a0a] selection:bg-white/20 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #333 0%, transparent 50%)' }} 
      />
      <div className="z-10 w-full max-w-xl px-6 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Vectrieve AI" className="h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(0,212,255,0.25)]" />
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}