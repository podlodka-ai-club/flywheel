import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { App } from './App.tsx';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('renders shell and shows health status from backend', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Triage Memory' })).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByTestId('health-status')).toHaveTextContent('ok');
  });
});
