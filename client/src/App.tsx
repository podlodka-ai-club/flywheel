import { useEffect, useState } from 'react';

type HealthState = 'loading' | 'error' | string;

export function App(): React.JSX.Element {
  const [status, setStatus] = useState<HealthState>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then((res) => res.json())
      .then((body: { status: string }) => {
        if (!cancelled) setStatus(body.status);
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Triage Memory</h1>
      <p>
        Backend health: <span data-testid="health-status">{status}</span>
      </p>
    </main>
  );
}
