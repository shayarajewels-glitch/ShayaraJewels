'use client';

/** Last-resort error boundary (replaces the root layout, so it must render <html>). */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#fbf7f1', color: '#2b2725', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ letterSpacing: '0.3em', fontSize: 22 }}>SHAYARA</p>
          <h1 style={{ fontWeight: 500 }}>Something went wrong</h1>
          <button onClick={reset} style={{ marginTop: 16, padding: '12px 24px', background: '#2b2725', color: '#fbf7f1', border: 0, borderRadius: 4, cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
