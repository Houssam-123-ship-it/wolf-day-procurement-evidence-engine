'use client';

import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { useAnalyseExplainer } from 'src/hooks/use-analyse-explainer';

// Shared "Explain finding (DeepSeek)" UI for both the FR and HU sections.
// Calls the existing POST /api/analyse route via useAnalyseExplainer -
// display only, never computes totals/scope/stale. See that hook and
// frontend/src/app/api/analyse/route.ts for the demo/model fallback.

export function ExplainerBox({
  label,
  buildPrompt,
  buildDemoFallback,
}: {
  label: string;
  buildPrompt: () => string;
  buildDemoFallback: () => string;
}) {
  const { loading, text, mode, error, explain } = useAnalyseExplainer();

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">🤝 Your quick, plain-language analyst</Typography>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="solar:chat-round-dots-bold" />}
          onClick={() => explain(buildPrompt(), buildDemoFallback())}
          disabled={loading}
        >
          {loading ? 'Asking…' : label}
        </Button>
        {mode && (
          <Label color={mode === 'model' ? 'success' : 'default'} variant="soft">
            X-Wolf-Mode: {mode}
          </Label>
        )}
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mt: 0.5 }}>
          {error}
        </Alert>
      )}
      {text && (
        <Typography
          variant="body2"
          sx={{ mt: 0.5, p: 1.5, borderRadius: 1, bgcolor: 'background.neutral', whiteSpace: 'pre-wrap' }}
        >
          {text}
        </Typography>
      )}
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        One click, one clear answer - no jargon, no guessing. In demo mode this shows a locally
        written explanation of the real numbers above (never the model) - in model mode it shows
        the live response instead. Either way it just reads out numbers already proven above; the
        totals and approvals never depend on this call succeeding.
      </Typography>
    </Stack>
  );
}
