'use client';

import * as React from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          action?: string;
          cData?: string;
          callback?: (token: string) => void;
          'error-callback'?: (errorCode: string) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'flexible';
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoaded?: () => void;
  }
}

export interface TurnstileWidgetRef {
  reset: () => void;
}

interface TurnstileWidgetProps {
  action?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  className?: string;
}

export const TurnstileWidget = React.forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  function TurnstileWidget({ action = 'login', onVerify, onExpire, className = '' }, ref) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const widgetIdRef = React.useRef<string | null>(null);
    const isRenderedRef = React.useRef(false);

    // Keep callbacks in stable refs so parent re-renders never trigger
    // effect cleanup or widget re-instantiations.
    const onVerifyRef = React.useRef(onVerify);
    onVerifyRef.current = onVerify;

    const onExpireRef = React.useRef(onExpire);
    onExpireRef.current = onExpire;

    const siteKey =
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAEqe-YZWwm_kx0Bs';

    // Expose reset() via ref
    React.useImperativeHandle(ref, () => ({
      reset: () => {
        if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch (err) {
            console.warn('[Turnstile] reset failed:', err);
          }
        }
      },
    }));

    React.useEffect(() => {
      if (!siteKey) {
        onVerifyRef.current('dev-mock-turnstile-token');
        return;
      }

      let isMounted = true;

      const renderWidget = () => {
        if (!isMounted || !containerRef.current || !window.turnstile) return;
        // If already rendered in this container, do not re-render
        if (isRenderedRef.current && widgetIdRef.current) return;

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            action: action,
            theme: 'dark',
            size: 'normal',
            callback: (token: string) => {
              if (isMounted) {
                onVerifyRef.current(token);
              }
            },
            'expired-callback': () => {
              if (isMounted && onExpireRef.current) {
                onExpireRef.current();
              }
            },
            'error-callback': (err: string) => {
              console.warn('[Turnstile] widget error:', err);
              if (isMounted && onExpireRef.current) {
                onExpireRef.current();
              }
            },
          });
          widgetIdRef.current = id;
          isRenderedRef.current = true;
        } catch (err) {
          console.warn('[Turnstile] render error:', err);
        }
      };

      // Ensure the Turnstile script is loaded in the document
      const scriptId = 'cf-turnstile-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          renderWidget();
        };
        document.head.appendChild(script);
      } else if (window.turnstile) {
        renderWidget();
      } else {
        // Script is already loading, wait for it
        const interval = setInterval(() => {
          if (window.turnstile) {
            clearInterval(interval);
            renderWidget();
          }
        }, 100);
        return () => clearInterval(interval);
      }

      return () => {
        isMounted = false;
        if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch {
            // ignore
          }
          widgetIdRef.current = null;
          isRenderedRef.current = false;
        }
      };
    }, [siteKey, action]); // Stable dependencies only

    if (!siteKey) {
      return null;
    }

    return (
      <div
        className={`my-3 flex justify-center min-h-[65px] ${className}`}
        ref={containerRef}
      />
    );
  }
);
