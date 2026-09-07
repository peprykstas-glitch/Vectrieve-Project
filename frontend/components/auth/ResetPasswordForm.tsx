// components/auth/ResetPasswordForm.tsx
'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
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

const resetSchema = z
  .object({
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters.')
      .max(72, 'Password must be less than 72 characters.')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter.')
      .regex(/[0-9]/, 'Must contain at least one number.')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  // If there's no token in URL — show an error immediately
  if (!token) {
    return (
      <div className="w-full bg-card/90 backdrop-blur-xl border border-border shadow-xl rounded-2xl overflow-hidden">
        <Card className="bg-transparent border-none shadow-none">
          <CardContent className="pt-8 pb-6 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
              <XCircle className="h-7 w-7 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Invalid reset link</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
            <Button
              onClick={() => router.push('/forgot-password')}
              className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium cursor-pointer shadow-sm"
            >
              Request New Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
              <h3 className="text-lg font-semibold text-foreground mb-2">Password updated!</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your password has been successfully reset. You can now sign in with your new credentials.
              </p>
            </div>
            <Button
              onClick={() => router.push('/login')}
              className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium cursor-pointer shadow-sm"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function onSubmit(data: ResetFormValues) {
    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setGlobalError(
          errorData.detail || errorData.message || 'Reset failed. The link may have expired.'
        );
      }
    } catch {
      setGlobalError('Cannot connect to server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full bg-card/90 backdrop-blur-xl border border-border shadow-xl rounded-2xl overflow-hidden">
      <Card className="bg-transparent border-none shadow-none">
        <CardHeader className="space-y-2 pb-6">
          <CardTitle className="text-xl text-foreground tracking-tight">Set new password</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Choose a strong password for your workspace.
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-xs font-medium">New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          className="pr-10 bg-background border-border text-foreground focus-visible:ring-1 focus-visible:ring-primary transition-all"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormDescription className="text-muted-foreground text-xs mt-1">
                      Min 12 characters, uppercase letter, number, and special symbol.
                    </FormDescription>
                    <FormMessage className="text-destructive opacity-90 text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-xs font-medium">Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirm ? 'text' : 'password'}
                          className="pr-10 bg-background border-border text-foreground focus-visible:ring-1 focus-visible:ring-primary transition-all"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-destructive opacity-90 text-xs" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all h-11 mt-2 rounded-xl font-medium cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
