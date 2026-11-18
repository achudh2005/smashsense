/**
 * SmashSense Production Monitoring & Telemetry
 * Privacy-first: Strips all sensitive data and NEVER tracks camera streams.
 */

export function initMonitoring(): void {
  const sentryDsn = (import.meta as any).env?.VITE_SENTRY_DSN;
  const analyticsId = (import.meta as any).env?.VITE_ANALYTICS_ID;

  // Initialize Error Monitoring if DSN provided
  if (sentryDsn && typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      // Capture uncaught client errors without sensitive data
      try {
        const errorPayload = {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: new Date().toISOString(),
        };
        // In production, would send to sentryDsn endpoint
        void errorPayload;
      } catch {
        void 0;
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      try {
        const reason = event.reason;
        void reason;
      } catch {
        void 0;
      }
    });
  }

  // Initialize Privacy-friendly Plausible or Vercel Analytics if configured
  if (analyticsId && typeof document !== 'undefined') {
    try {
      const script = document.createElement('script');
      script.defer = true;
      script.dataset.domain = analyticsId;
      script.src = 'https://plausible.io/js/script.js';
      document.head.appendChild(script);
    } catch {
      void 0;
    }
  }
}
