# Changelog

## [Unreleased]

### Added
- Journal entry validation helper (`lib/journal-entry-validation.ts`) consolidating shared checks for create/update APIs.
- Update/DELETE endpoints for journal entries (`app/api/journal-entries/[id]/route.ts`) and balance sheet API (`app/api/reports/balance-sheet/route.ts`).
- Navigation item "帳簿" and dedicated books page (`app/books/page.tsx`) hosting the general ledger and journal reports.
- Balance sheet report UI component (`components/balance-sheet-report.tsx`).
- Operations manual consolidating setup, workflows, and change history guidance (`docs/operations-manual.md`).
- Accounting feature roadmap covering closing, tax, AR/AP, and bank reconciliation planning (`docs/accounting-roadmap.md`).
- Closing period management API and UI (`app/api/closing-periods/route.ts`, `components/closing-period-manager.tsx`) enabling month/year-end locks.
- Additional tax categories for `不課税` and `対象外`, including seeding/upsert support (`lib/seed.ts`).

### Changed
- `app/reports/page.tsx` now focuses on trial balance, balance sheet, and income statement reports only.
- `components/journal-entry-form.tsx` supports editing existing journal entries, including form state handling and query invalidation for related reports.
- `components/transactions-table.tsx` exposes edit/delete actions that interact with the new journal entry APIs and refresh dependent queries.
- General ledger (`components/general-ledger-report.tsx`) and journal report (`components/journal-report.tsx`) moved to the new books page.
- `README.md` now surfaces setup instructions, feature overview, and documentation flow for onboarding.
- `docs/operations-manual.md` references the new accounting roadmap for upcoming features.
- Journal entry APIs block edits/deletes for locked periods and expose lock metadata to the UI.
- Journal entry form now displays tax categories in Japanese and aligns with the expanded master list.

### Removed
- Deprecated `docs/WORKLOG.md`; change history is now captured in this changelog.
- Redundant seed bootstrap script (`lib/seed 2.ts`).

### Notes for Next Steps
- Restart the dev server (`npm run dev`) to load the updated routes/components.
- Verify journal entry create/update/delete flows and ensure the books page reflects changes.
- Initialise git (if not already) and commit these updates to share with the team.
