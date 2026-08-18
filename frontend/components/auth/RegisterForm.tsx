// components/auth/RegisterForm.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Building } from 'lucide-react';

import { registerSchema, type RegisterFormValues } from '@/lib/schemas/auth';
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
  FormDescription,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      company: '',
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      await apiClient('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      // Post-registration routing strategy: Redirect to login with a success parameter
      router.push('/login?registered=true');
      
    } catch (error: any) {
      // Extensive mapping of backend validation constraints to the frontend UI
      if (error.status === 422 && error.details) {
        error.details.forEach((err: any) => {
          const field = err.loc[err.loc.length - 1] as keyof RegisterFormValues;
          form.setError(field, { type: 'server', message: err.msg });
        });
      } else if (error.status === 409) {
        form.setError('email', { type: 'server', message: 'An enterprise workspace associated with this corporate email already exists.' });
      } else {
        setGlobalError(error.message || 'Workspace provisioning failed. Please contact your system administrator.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 shadow-2xl shadow-black/60 rounded-2xl overflow-hidden">
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-xl text-white tracking-tight">Provision Enterprise Workspace</CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Establish a secure, isolated RAG environment for your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Google 1-Click Sign-Up Button */}
          <Button
            type="button"
            onClick={() => {
              window.location.href = '/api/auth/google/url';
            }}
            variant="outline"
            className="w-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-100 border-zinc-700/60 hover:border-zinc-500 h-11 rounded-xl font-medium flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Sign up with Google
          </Button>

          <div className="relative my-5 flex items-center justify-center">
            <div className="border-t border-zinc-800/80 w-full" />
            <span className="bg-[#0e0e0e] px-3 text-[11px] font-medium text-zinc-500 uppercase tracking-widest shrink-0 rounded-full">
              or register with email
            </span>
            <div className="border-t border-zinc-800/80 w-full" />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {globalError && (
                <div className="p-3 text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
                  {globalError}
                </div>
              )}
              
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Full Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Jane Doe" 
                        className="bg-[#121212] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20 transition-all"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 opacity-90 text-xs" />
                  </FormItem>
                )}
              />

              {/* Grid layout utilization to manage spatial density effectively */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Corporate Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="jane@company.com" 
                          className="bg-[#121212] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20 transition-all"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 opacity-90 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-zinc-300">Organization <span className="text-zinc-600 text-xs">(Optional)</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Building className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                          <Input 
                            placeholder="Acme Corp" 
                            className="pl-9 bg-[#121212] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20 transition-all"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 opacity-90 text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-zinc-300">Master Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        className="bg-[#121212] border-white/10 text-white focus-visible:ring-1 focus-visible:ring-white/20 transition-all"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-zinc-600 text-xs mt-1">
                      Strict cryptographic policy: Minimum 12 characters, uppercase, number, and special symbol.
                    </FormDescription>
                    <FormMessage className="text-red-400 opacity-90 text-xs" />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-white text-black hover:bg-zinc-200 transition-colors h-11 mt-4 rounded-xl font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Provision Workspace'
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center">
            <span className="text-sm text-zinc-500">Already possess an active workspace? </span>
            <a href="/login" className="text-sm text-white hover:underline underline-offset-4 transition-all">
              Sign in securely
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}