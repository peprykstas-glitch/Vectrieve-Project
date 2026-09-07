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
import { TurnstileWidget, type TurnstileWidgetRef } from '@/components/auth/TurnstileWidget';

import { useRouter } from 'next/navigation';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = React.useState<string>('');
  const turnstileRef = React.useRef<TurnstileWidgetRef>(null);

  const handleVerify = React.useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleExpire = React.useCallback(() => {
    setTurnstileToken('');
  }, []);

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
        body: JSON.stringify({
          email: data.email,
          'cf-turnstile-response': turnstileToken,
        }),
      });

      if (response.ok || response.status === 404) {
        setIsSuccess(true);
      } else {
        turnstileRef.current?.reset();
        setTurnstileToken('');
        const errorData = await response.json().catch(() => ({}));
        setGlobalError(
          errorData.detail || errorData.message || 'An error occurred. Please try again.'
        );
      }
    } catch {
      turnstileRef.current?.reset();
      setTurnstileToken('');
      setGlobalError('Cannot connect to server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="w-full bg-card/90 backdrop-blur-xl border border-border shadow-xl rounded-2xl overflow-hidden">
        <Card className="bg-transparent border-none shadow-none">
          <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Check your inbox</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If an account exists for <span className="text-foreground font-medium">{form.getValues('email')}</span>,
                we have sent a secure password reset link.
              </p>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Don&apos;t see it? Check your spam folder or contact your workspace administrator.
            </p>

            <div className="w-full mt-4 pt-4 border-t border-border">
              <a
                href="/login"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Return to Sign In
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full bg-card/90 backdrop-blur-xl border border-border shadow-xl rounded-2xl overflow-hidden">
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-xl text-foreground tracking-tight">Reset your password</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Enter your corporate email and we&apos;ll send you a secure reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {globalError && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                  {globalError}
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-xs font-medium">Work Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="name@company.com"
                          className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary transition-all"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-destructive opacity-90 text-xs" />
                  </FormItem>
                )}
              />

              {/* Cloudflare Turnstile bot verification */}
              <TurnstileWidget
                ref={turnstileRef}
                action="forgot_password"
                onVerify={handleVerify}
                onExpire={handleExpire}
              />

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all h-11 mt-2 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={isSubmitting || !turnstileToken}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : !turnstileToken ? (
                  <span className="flex items-center text-muted-foreground text-sm">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
                    Verifying security...
                  </span>
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
