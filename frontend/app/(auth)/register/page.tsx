// app/(auth)/register/page.tsx
import { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Hexagon } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Register | Neurach AI',
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
          <span className="text-2xl font-bold tracking-tight text-white font-sans">
            Neurach
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 tracking-widest uppercase">
            AI
          </span>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}