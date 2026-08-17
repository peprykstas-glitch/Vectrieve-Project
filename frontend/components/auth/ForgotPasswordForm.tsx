// components/auth/ForgotPasswordForm.tsx
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
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

import { useRouter } from 'next/navigation';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [resetToken, setResetToken] = React.useState<string | null>(null);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(data: ForgotFormValues) {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });

      if (response.ok || response.status === 404) {
        const resData = await response.json().catch(() => ({}));
        if (resData.token) {
          setResetToken(resData.token);
        }
        setIsSuccess(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setGlobalError(
          errorData.detail || errorData.message || 'An error occurred. Please try again.'
        );
      }
    } catch {
      setGlobalError('Cannot connect to server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="w-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 shadow-2xl shadow-black/60 rounded-2xl overflow-hidden">
        <Card className="bg-transparent border-none shadow-none">
          <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Check your inbox</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                If an account exists for <span className="text-zinc-200 font-medium">{form.getValues('email')}</span>,
                you will receive a password reset link.
              </p>
            </div>

            {resetToken && (
              <div className="w-full mt-2 pt-4 border-t border-white/10 flex flex-col items-center gap-2">
                <p className="text-xs text-zinc-400">Authorized Workspace Session:</p>
                <Button
                  onClick={() => router.push(`/reset-password?token=${resetToken}`)}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl h-11 transition-colors"
                >
                  Set New Password Instantly →
                </Button>
              </div>
            )}

            <p className="text-xs text-zinc-600 mt-2">
              Don&apos;t see it? Check your spam folder or contact your system administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 shadow-2xl shadow-black/60 rounded-2xl overflow-hidden">
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-xl text-white tracking-tight">Reset your password</CardTitle>
          <CardDescription className="text-zinc-400 text-sm">
            Enter your corporate email and we&apos;ll send you a secure reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                          placeholder="name@company.com"
                          className="pl-9 bg-[#121212] border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-white/20 transition-all"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-400 opacity-90 text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-zinc-200 transition-colors h-11 mt-2 rounded-xl font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
