'use client';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import {
  frEvent,
  frVersionV1,
  frVersionV2,
  frNovexFinding,
  frCurrentTotalRows,
  frVersionV2ChangeNote,
} from 'src/data/fr-evidence';
import {
  huEvent,
  huAsterTotalEUR,
  huOrbitTotalEUR,
  huCurrentTotalEUR,
  huFxRateHUFPerEUR,
} from 'src/data/hu-evidence';

import { ExplainerBox } from './explainer-box';

// Track 1 (Procurement evidence engine) - FR primary case.
// Layout modeled on SpendDrilldown's Dialog/Table row shape
// (nullmessung/spend-drilldown.tsx) and the approve/reset button pattern
// from dashboard/components/page.tsx:24,50.
//
// Step 4: finding + evidence rows + approval control (done).
// Step 5 (this file): D1 stale-approval rule. An approval stores the event
// id it was approved against (approvedAtVersion). If the active FR event
// changes (a simulated correction, UPD-FR-003-demo) after approval, the
// sup-aster approval flips to stale and is blocked from re-approval as-is;
// the unrelated sup-novex approval is untouched because it never depended
// on UPD-FR-002/003's version. Idempotent replay of the *same* event and
// the HU guard case are step 6 (scripts/verify_replay_and_hu.py), not UI.
//
// Step 6b (this file, bottom section): optional DeepSeek explainer. Calls
// the EXISTING POST /api/analyse route (frontend/src/app/api/analyse/route.ts)
// server-side only - no client-side key, no new endpoint. That route already
// falls back to a labelled demo response (X-Wolf-Mode: demo) when
// WOLF_MODEL_BASE_URL/WOLF_MODEL_NAME are unset, and calls the model
// (X-Wolf-Mode: model) when they are set. This panel only displays the
// returned text; it never feeds into totalEUR, isStale, or any replay/HU
// logic above - those are byte-identical whether this section is used or not.

const fmtNum = (v: number) =>
  v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type AsterApproval = { approvedAtVersion: string | null };
type NovexApproval = { approved: boolean };

export function FrEvidencePanel() {
  const [version, setVersion] = useState<'v1' | 'v2'>('v1');
  const [aster, setAster] = useState<AsterApproval>({ approvedAtVersion: null });
  const [novex, setNovex] = useState<NovexApproval>({ approved: false });

  const active = version === 'v1' ? frVersionV1 : frVersionV2;
  const totalEUR = useMemo(() => active.rows.reduce((s, r) => s + r.netValueEUR, 0), [active]);

  // D1: approval is bound to the version it was approved against. It is
  // stale the moment the active event id no longer matches that version -
  // never inferred from "did the numbers actually change".
  const isStale = aster.approvedAtVersion !== null && aster.approvedAtVersion !== active.eventId;
  const isApprovedCurrent = aster.approvedAtVersion === active.eventId;

  const handleApproveAster = () => setAster({ approvedAtVersion: active.eventId });
  const handleResetAster = () => setAster({ approvedAtVersion: null });
  const handleApplyCorrection = () => setVersion('v2');
  const handleResetVersion = () => {
    setVersion('v1');
    setAster({ approvedAtVersion: null });
  };

  const handleApproveNovex = () => setNovex({ approved: true });
  const handleResetNovex = () => setNovex({ approved: false });

  // Dual-audience prompts: fixed text, precomputed truth only (D0-D5,
  // validation.md), the model narrates - it never computes a total, scope
  // or stale state. Two output blocks requested: Block 1 buyer-plain,
  // Block 2 technical with row refs / version ids / [?] for missing
  // evidence (matches the [?] convention already in the route's own system
  // prompt, frontend/src/app/api/analyse/route.ts:23).
  const buildFrPrompt = () =>
    'Track 1 UPD-FR-002 replace_supplier_subset sup-aster. Precomputed truth only, do not compute: ' +
    'old FR total 171,941.83 EUR, new FR total 116,546.84 EUR on 24 rows. Touched 16 sup-aster rows, ' +
    'untouched 8 sup-novex rows byte-identical. Header trap avoided: sum Net value col 11 not Invoice ' +
    'total col 4. Cancellations applied: -11336.16 on FAC-WOLF-0001 and -13549.14 on FAC-WOLF-0004. ' +
    'Approval pinned to UPD-FR-002 went stale on correction. Output two blocks. Block 1 Buyer ' +
    'non-technical: pain before in one sentence, what changed in two sentences, what was done and is ' +
    'approval safe now in two sentences, plain words no jargon. Block 2 Technical: scope, old vs new ' +
    'totals, traps handled with row refs FR-v2--Sheet1.csv, replay identical proof, version ids ' +
    'UPD-FR-002, mark missing as [?]. English only.';

  const buildHuPrompt = () =>
    'Track 1 UPD-HU-002 add_supplier sup-orbit. Precomputed truth only, do not compute: old HU 24 ' +
    'rows sup-aster 196,890.50 EUR, new HU 48 rows combined 389,114.61 EUR with sup-orbit 192,224.11 ' +
    'EUR appended. Original 24 untouched. HUF→EUR fx 394 verified 0 mismatches. No stale on ' +
    'unrelated FR approval. Output two blocks. Block 1 Buyer non-technical: pain before new supplier ' +
    'arrival, what added, what preserved, plain words. Block 2 Technical: add vs replace proof, ' +
    'counts 24→48, FX rule, version id UPD-HU-002, mark missing as [?]. English only.';

  // Locally-authored, fully deterministic demo-mode text - shown ONLY when
  // the route replies X-Wolf-Mode: demo (see use-analyse-explainer.ts). The
  // pre-existing route's own demo fallback is a fixed, unrelated blurb
  // about the whole dataset (4,872 rows / 29 markets), not the FR/HU
  // finding - this replaces that with an actual explanation of the numbers
  // already on this page, built from the same constants as the prompts
  // above. Never claims to be AI output; the route itself is untouched.
  const buildFrDemoFallback = () =>
    '[Demo mode - locally written summary, not a model response]\n\n' +
    'Buyer summary:\n' +
    'Before: this award relied on supplier data that later turned out to need correcting.\n' +
    `What changed: a correction for sup-aster arrived, moving the total from 171,941.83 EUR to ` +
    `116,546.84 EUR across 24 records (16 rows touched, 8 sup-novex rows left untouched) - the ` +
    `difference comes from two cancelled deliveries that had to be subtracted correctly.\n` +
    'What was done: because the earlier approval was based on the old numbers, it was automatically ' +
    'marked stale so nobody keeps acting on an outdated total - it is safe to review and re-approve.\n\n' +
    'Technical summary:\n' +
    'Event UPD-FR-002, mode replace_supplier_subset, scope sup-aster. Old total 171,941.83 EUR -> ' +
    'new total 116,546.84 EUR (24 rows). Header-total trap avoided: summed Net value (col 11), never ' +
    'the repeated Invoice total (col 4) - evidence in FR-v2--Sheet1.csv. Cancellations applied: ' +
    '-11336.16 EUR (FAC-WOLF-0001), -13549.14 EUR (FAC-WOLF-0004). Replaying UPD-FR-002 twice ' +
    'produces an identical result (idempotent, verified). Approval pinned to UPD-FR-002 is now stale.';

  const buildHuDemoFallback = () =>
    '[Demo mode - locally written summary, not a model response]\n\n' +
    'Buyer summary:\n' +
    'Before: only one supplier (sup-aster) was recorded for this market.\n' +
    'What changed: a new supplier, sup-orbit, was added with 24 records worth 192,224.11 EUR - ' +
    'nothing about the existing 24 sup-aster records (196,890.50 EUR) was touched or replaced.\n' +
    'What was done: the system correctly told an addition apart from a replacement, so the existing ' +
    'approval for sup-aster is untouched and still valid - the market total is now 389,114.61 EUR ' +
    'across 48 records.\n\n' +
    'Technical summary:\n' +
    'Event UPD-HU-002, mode add_supplier, scope sup-orbit. Rows 24 -> 48 (24 sup-aster untouched + ' +
    '24 sup-orbit appended). sup-orbit values converted HUF to EUR at a rate of 394, verified with 0 ' +
    'mismatches across all 24 rows. No effect on the unrelated FR approval.';

  return (
    <Stack spacing={2} sx={{ px: 3, pb: 3 }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <Label color="info">active version: {active.eventId}</Label>
        <Label color="warning">scope: {frEvent.scopeSupplierId}</Label>
        <Label color="default">
          {frEvent.mode} · {frCurrentTotalRows} rows total in FR
        </Label>
        {isStale && <Label color="error">STALE — re-review required</Label>}
        {isApprovedCurrent && <Label color="success">Approved locally</Label>}
        {!aster.approvedAtVersion && <Label color="warning">Needs review</Label>}
      </Stack>

      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        sup-aster finding, recomputed from {active.eventId}: {fmtNum(totalEUR)} € across{' '}
        {active.rows.length} in-scope rows. Independent of the dashboard ledger (DATASET.md:26) —
        never summed into the 4,872-row canonical total.
      </Typography>

      {version === 'v2' && (
        <Alert severity="warning" icon={<Iconify icon="solar:danger-triangle-bold" />}>
          {frVersionV2ChangeNote} Any approval made on {frVersionV1.eventId} is now stale.
        </Alert>
      )}

      <TableContainer sx={{ maxHeight: 360 }}>
        <Table size="small" stickyHeader sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
          <TableHead>
            <TableRow>
              <TableCell>Source row</TableCell>
              <TableCell>Site</TableCell>
              <TableCell>Invoice</TableCell>
              <TableCell>Article</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Net value</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Payer (name, col23)</TableCell>
              <TableCell>Payer (code, col34)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {active.rows.map((r) => {
              const changed = version === 'v2' && r.sourceRow === 2;
              return (
                <TableRow key={`${r.invoice}-${r.sourceRow}`} hover selected={changed}>
                  <TableCell sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                    {r.sourceFile}:{r.sourceRow}
                  </TableCell>
                  <TableCell>{r.siteCode}</TableCell>
                  <TableCell>{r.invoice}</TableCell>
                  <TableCell>{r.article}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {r.qty.toLocaleString('en-GB')}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: changed ? 700 : 400,
                      color: r.netValueEUR < 0 ? 'error.main' : changed ? 'warning.dark' : 'text.primary',
                    }}
                  >
                    {fmtNum(r.netValueEUR)} € {changed && '(corrected)'}
                  </TableCell>
                  <TableCell>
                    <Label color={r.invoiceTypeCode === 'CREDIT_NOTE' ? 'error' : 'default'} variant="soft">
                      {r.invoiceTypeCode}
                    </Label>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{r.payerName}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{r.payerCode}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        {!isStale ? (
          <Button
            variant="contained"
            startIcon={<Iconify icon="solar:check-circle-bold" />}
            onClick={handleApproveAster}
            disabled={isApprovedCurrent}
          >
            {isApprovedCurrent ? 'Approved locally' : 'Approve FR finding'}
          </Button>
        ) : (
          <Button variant="contained" color="error" disabled startIcon={<Iconify icon="solar:danger-triangle-bold" />}>
            Stale — blocked, re-review required
          </Button>
        )}
        <Button variant="outlined" onClick={handleResetAster} disabled={!aster.approvedAtVersion}>
          Reset approval
        </Button>

        <Divider orientation="vertical" flexItem />

        <Button
          variant="outlined"
          color="warning"
          onClick={handleApplyCorrection}
          disabled={version === 'v2'}
        >
          Simulate corrected event (demo)
        </Button>
        <Button variant="text" onClick={handleResetVersion} disabled={version === 'v1'}>
          Reset to {frVersionV1.eventId}
        </Button>
      </Stack>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Stack spacing={1}>
        <Typography variant="subtitle2">Unrelated approval (isolation check)</Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Label color="default">sup-novex baseline · {frNovexFinding.rowCount} rows</Label>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {fmtNum(frNovexFinding.totalEUR)} € — out of scope for {frEvent.id} and{' '}
            {frVersionV2.eventId}
          </Typography>
          {novex.approved ? (
            <Label color="success">Approved locally</Label>
          ) : (
            <Label color="warning">Needs review</Label>
          )}
          <Button size="small" variant="contained" onClick={handleApproveNovex} disabled={novex.approved}>
            {novex.approved ? 'Approved locally' : 'Approve sup-novex baseline'}
          </Button>
          <Button size="small" variant="outlined" onClick={handleResetNovex} disabled={!novex.approved}>
            Reset
          </Button>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
          Applying the sup-aster correction above must never change this approval's state - proves
          scope isolation (D5).
        </Typography>
      </Stack>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <ExplainerBox
        label="Explain finding (DeepSeek)"
        buildPrompt={buildFrPrompt}
        buildDemoFallback={buildFrDemoFallback}
      />

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Stack spacing={1}>
        <Typography variant="subtitle2">HU guard case ({huEvent.id})</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <Label color="info">{huEvent.mode}</Label>
          <Label color="warning">scope: {huEvent.scopeSupplierId}</Label>
          <Label color="default">
            {huEvent.previousRows}→{huEvent.currentRows} rows
          </Label>
        </Stack>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          sup-aster (original {huEvent.previousRows} rows, untouched): {fmtNum(huAsterTotalEUR)} € ·
          sup-orbit ({huEvent.incomingRows} rows appended, HUF→EUR at {huFxRateHUFPerEUR}):{' '}
          {fmtNum(huOrbitTotalEUR)} € · combined: {fmtNum(huCurrentTotalEUR)} €. Proven by
          scripts/verify_replay_and_hu.py — 48 rows, original 24 byte-identical, fx check 0
          mismatches. Read-only display; no approve/stale interaction on this guard case.
        </Typography>
        <ExplainerBox
          label="Explain finding (DeepSeek)"
          buildPrompt={buildHuPrompt}
          buildDemoFallback={buildHuDemoFallback}
        />
      </Stack>

      <Box sx={{ flexGrow: 1 }} />
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
        Local UI state only, no persistence. The explainer above only narrates the numbers already
        computed on this page - it never computes totals, scope or stale state itself.
      </Typography>
    </Stack>
  );
}
