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
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden py-12 px-4 transition-colors">
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" 
      />
      <div className="z-10 w-full max-w-xl flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8">
          <span className="text-2xl font-bold tracking-tight text-foreground font-sans">
            Neurach
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 tracking-widest uppercase">
            AI
          </span>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}