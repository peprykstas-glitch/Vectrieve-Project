// components/auth/LoginForm.tsx
'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth';
import { apiClient } from '@/lib/api/client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const justRegistered = searchParams.get('registered') === 'true';
  const sessionExpired = searchParams.get('session_expired') === 'true';

  // Initialize React Hook Form with Zod schema validation
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      // Dispatch payload to the BFF Next.js Proxy Route.
      // The server will securely establish the HttpOnly session cookie upon success.
      await apiClient('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      // Execute a hard router push to the protected application workspace
      router.push('/');
      // Force a comprehensive layout re-render to ensure the new session cookie is recognized globally
      router.refresh(); 
      
    } catch (error: any) {
      // Algorithmic mapping of FastAPI 422 Validation Errors directly to the React Hook Form state
      if (error.status === 422 && error.details) {
        error.details.forEach((err: any) => {
          // Traverse the FastAPI error location array (e.g., loc: ['body', 'email'])
          const field = err.loc[err.loc.length - 1] as keyof LoginFormValues;
          form.setError(field, { type: 'server', message: err.msg });
        });
      } else if (error.status === 404) {
        form.setError('email', { type: 'server', message: error.message || 'This email address is not registered.' });
      } else if (error.status === 401) {
        form.setError('password', { type: 'server', message: error.message || 'Incorrect password. Please try again.' });
      } else {
        setGlobalError(error.message || 'A critical systemic error occurred. Please contact IT support.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // Implementation of the Vercel/Linear design language: glassmorphism, subtle borders, deep shadows
    <div className="w-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 shadow-2xl shadow-black/60 rounded-2xl overflow-hidden">
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-xl text-white tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Enter your corporate credentials to access the secure RAG environment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Conditional rendering of global, non-field-specific errors */}
              {justRegistered && (
                <div className="p-3 text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Workspace provisioned successfully. Sign in to continue.
                </div>
              )}
              {sessionExpired && !globalError && (
                <div className="p-3 text-sm text-amber-400 bg-amber-950/30 border border-amber-900/50 rounded-lg">
                  Your session has expired. Please sign in again.
                </div>
              )}
              {globalError && (
                <div className="p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                  {globalError}
                </div>
              )}
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Work Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="name@company.com" 
                        className="bg-[#121212] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20 transition-all"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 opacity-90" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-zinc-300">Password</FormLabel>
                      <a href="/forgot-password" className="text-xs text-zinc-500 hover:text-white transition-colors">
                        Forgot password?
                      </a>
                    </div>
                    <FormControl>
                      <Input 
                        type="password" 
                        className="bg-[#121212] border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 transition-all"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 opacity-90" />
                  </FormItem>
                )}
              />

              {/* High contrast primary button with loading state micro-interactions */}
              <Button 
                type="submit" 
                className="w-full bg-white text-black hover:bg-zinc-200 transition-colors h-11 mt-2 rounded-xl font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center">
            <span className="text-sm text-zinc-500">Require an enterprise workspace? </span>
            <a href="/register" className="text-sm text-white hover:underline underline-offset-4 transition-all">
              Request provisioning
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}