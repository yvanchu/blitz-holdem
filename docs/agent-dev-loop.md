# Bullet Poker — Agent Dev Loop

A repeatable process for an AI agent to keep improving Bullet Poker on a cadence:
**detect and fix bugs**, and **incrementally improve the UX** — without regressing the
game or bypassing human review.

## Goal

Each iteration should leave the game a little better: one or more real bug fixes and/or
spec-driven UX improvements, fully verified against the test suite, delivered as a
**pull request** for human review. The loop never merges or pushes on its own.

## Cadence

A scheduled workflow ("Bullet Poker dev loop") runs on a regular interval. Each run is a
single, self-contained iteration that opens **one PR**. The schedule can be changed or the
workflow disabled at any time from the app's workflow settings.

## What each iteration does

1. **Establish baseline.** Run the fast gate (below) and confirm it is green before
   touching anything. If the baseline is already red, fixing it is the iteration.
2. **Pick a small, high-value slice.** Prefer, in order:
   - A correctness/bug fix (especially anything where behavior contradicts the PRD,
     `README.md`, or `docs/ux.md`).
   - A spec-driven UX item from the backlog in `docs/progress.md` (the
     "Pre-Release Checklist") that aligns with `docs/ux.md`.
   Keep the scope to what can be implemented, tested, and reviewed in one PR.
3. **Implement with tests.** Any behavior change must be pinned by a test. UI changes must
   preserve existing component-test assertions (colors, sizes, testids).
4. **Verify.** Re-run the full fast gate; reproduce the original symptom and confirm it is
   gone. See "Verification".
5. **Open a PR.** Summarize the change, the spec/backlog item it addresses, the tests added,
   and anything the reviewer should sanity-check. Flag any user-facing behavior change
   prominently.
6. **Update the log.** Add a dated entry to the `docs/progress.md` Session Log and check off
   any backlog items completed.

## Sources of truth

- **Product behavior**: `docs/prd.md`, `README.md`, `docs/rules.md`.
- **UX**: `docs/ux.md` — especially §7 "Consistent Color Language":
  - Green `#10B981` = safe/positive (Check, Call, winning)
  - Amber `#F59E0B` = betting/neutral (Raise, Bet, pot, chips)
  - Red `#EF4444` = danger/loss (Fold, low time, losing)
  - Never use green for a destructive action; never use red for a positive outcome.
- **Backlog + prior decisions**: `docs/progress.md`.

## Guardrails

- **Human review gate.** The loop opens PRs; it does **not** merge or push to `main`.
- **Respect recorded decisions.** `docs/progress.md` documents intentional choices. Do not
  re-litigate them without a clear reason. Current standing decisions include:
  - Button order `Call | Raise | Check | Fold` is intentional.
  - Fold corner placement is intentional (no extra spatial separation).
  - No street-transition indicators; no how-to-play onboarding (audience knows poker).
- **Don't break tests to make a point.** If a change conflicts with an existing assertion,
  either keep the assertion or update both the code and the test deliberately, and explain
  why in the PR.
- **Small, reversible steps.** One concern per PR. Avoid drive-by refactors.
- **Security items** in the checklist are valuable but higher-risk; prefer to surface them
  for human prioritization rather than changing auth/validation behavior unattended.

## Verification (the "fast gate")

Run from the repo root before and after each change:

```bash
pnpm typecheck        # all packages
pnpm lint             # eslint, must be clean (0 errors, 0 warnings)
pnpm build            # production build of every package

# Unit + integration tests (excludes the slow Playwright e2e suite):
pnpm --filter @bullet-poker/common --filter @bullet-poker/server --filter @bullet-poker/client run test
pnpm --filter @bullet-poker/server run test:integration
```

Expected green baseline: **common 47, server unit 22, server integration 60, client 194**.

The Playwright **e2e** suite (`pnpm --filter @bullet-poker/e2e run test`) needs browsers
(`pnpm --filter @bullet-poker/e2e exec playwright install`) and boots a dev server. It is
slower and flakier, so it is **not** part of the fast gate. Run it when a change touches
end-to-end flows (connection, reconnection, full hand play).

## Running an iteration manually

You can trigger the loop on demand instead of waiting for the schedule:

- From the app: open the "Bullet Poker dev loop" workflow and run it now.
- Or just start a session and instruct the agent: "Run one Bullet Poker dev-loop iteration —
  pick a bug or a UX backlog item, fix it with tests, verify the fast gate, and open a PR."
