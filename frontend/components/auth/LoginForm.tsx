// components/auth/LoginForm.tsx
'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

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
  const oauthError = searchParams.get('error');

  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google/url';
  };

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
            Sign in to access your secure knowledge base and RAG assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google 1-Click Sign-In Button */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-100 border-zinc-700/60 hover:border-zinc-500 h-11 rounded-xl font-medium flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Continue with Google
          </Button>

          <div className="relative my-5 flex items-center justify-center">
            <div className="border-t border-zinc-800/80 w-full" />
            <span className="bg-[#0e0e0e] px-3 text-[11px] font-medium text-zinc-500 uppercase tracking-widest shrink-0 rounded-full">
              or continue with email
            </span>
            <div className="border-t border-zinc-800/80 w-full" />
          </div>

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
              {oauthError && !globalError && (
                <div className="p-3 text-sm text-amber-400 bg-amber-950/30 border border-amber-900/50 rounded-lg">
                  {oauthError === 'oauth_cancelled'
                    ? 'Google sign-in was cancelled.'
                    : oauthError === 'server_error'
                    ? 'Unable to complete sign-in. Please try again.'
                    : decodeURIComponent(oauthError)}
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
                className="w-full bg-white text-black hover:bg-zinc-200 transition-colors h-11 mt-2 rounded-xl font-medium cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>

              {/* Live Demo Sandbox Access Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      const res = await fetch('/api/auth/demo', { method: 'POST' });
                      if (res.ok) {
                        window.location.href = '/';
                      } else {
                        const errData = await res.json().catch(() => ({ detail: 'Demo initialization failed' }));
                        setGlobalError(errData.detail || 'Demo initialization failed. Please try again.');
                      }
                    } catch (e: any) {
                      setGlobalError(e.message || 'Demo service unavailable');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Explore Interactive Demo (Instant Access)</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-0.5 text-zinc-400" />
                </button>
              </div>
            </form>
          </Form>
          <div className="mt-6 text-center">
            <span className="text-sm text-zinc-500">Don&apos;t have an account? </span>
            <a href="/register" className="text-sm text-white font-medium hover:underline underline-offset-4 transition-all">
              Sign up
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}