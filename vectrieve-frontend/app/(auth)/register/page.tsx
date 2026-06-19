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
          <Hexagon className="w-8 h-8 text-white fill-white/10" strokeWidth={1.5} />
          <span className="text-2xl font-semibold tracking-tight text-white">Vectrieve</span>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}