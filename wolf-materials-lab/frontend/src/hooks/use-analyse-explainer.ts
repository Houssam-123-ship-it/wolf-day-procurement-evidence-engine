import { useState, useCallback } from 'react';

// Shared client for the existing POST /api/analyse route
// (frontend/src/app/api/analyse/route.ts). Server-side only - no key ever
// reaches the browser. The route itself falls back to a fixed, GENERIC demo
// response (X-Wolf-Mode: demo) whenever WOLF_MODEL_BASE_URL/WOLF_MODEL_NAME
// are unset - that fallback text is unrelated to whatever prompt was sent
// (it always reports overall dataset stats, not the FR/HU finding). Calling
// code may pass a `demoFallback` string to `explain()`: when the response
// comes back in demo mode, THAT text is shown instead of the route's
// generic filler - still 100% deterministic, still not model output, just a
// locally-authored explanation of the real precomputed numbers instead of
// an unrelated canned blurb. In model mode the real model response is
// always shown untouched. This hook never computes or touches any total,
// scope or stale-approval logic either way.

export type ExplainerState = {
  loading: boolean;
  text: string | null;
  mode: 'demo' | 'model' | null;
  error: string | null;
};

const IDLE: ExplainerState = { loading: false, text: null, mode: null, error: null };

export function useAnalyseExplainer() {
  const [state, setState] = useState<ExplainerState>(IDLE);

  const explain = useCallback(async (prompt: string, demoFallback?: string) => {
    setState({ loading: true, text: null, mode: null, error: null });
    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', text: prompt }] }),
      });
      const routeText = await res.text();
      const mode = res.headers.get('X-Wolf-Mode') === 'model' ? 'model' : 'demo';
      if (!res.ok) {
        setState({ loading: false, text: null, mode, error: routeText || `HTTP ${res.status}` });
        return;
      }
      const text = mode === 'demo' && demoFallback ? demoFallback : routeText;
      setState({ loading: false, text, mode, error: null });
    } catch (err) {
      setState({
        loading: false,
        text: null,
        mode: null,
        error: err instanceof Error ? err.message : 'Explainer call failed.',
      });
    }
  }, []);

  const reset = useCallback(() => setState(IDLE), []);

  return { ...state, explain, reset };
}
