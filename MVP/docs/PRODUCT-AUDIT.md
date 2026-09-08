# Product audit - 2026-09-08

Scope: initial source inspection and automated checks, not a tax-law certification.

## Actual baseline

- Next.js wizard exists, including employment, investments, rental and business steps.
- XML Flex and position-based PDF 867 import exist. Validation against two historical samples does not establish support for every issuer or layout.
- Salary, business, rental, investment and credit-point calculation modules exist.
- Browser-print summary and forms checklist exist. These are not populated official filing forms.
- Baseline: 103 tests passed, but TypeScript failed because the refund result omitted three required fields.

## Changes in this audit

- Return additional taxable income, its withholding, and locality credit in the refund result; add two regression tests.
- Carry missing information and calculation notes into the printed summary.
- Explicitly identify the printed summary as a draft, not an official filing form.

## Release blockers, in priority order

1. Unknown input becomes zero. `wizard-state.tsx:num` maps blanks and invalid numbers to zero; `build-refund-input.ts:employersFromFields` accepts a withholding-only employer. Introduce unknown/confirmed-zero/entered states and gate estimates and exports on completeness.
2. Investment aggregation and isolation are incomplete. `build-refund-input.ts:buildRefundInput` includes imported investments even when the investor profile is disabled, with no same-year guard at this boundary. The wizard stores one imported file, not a multi-document annual case. Add year isolation, duplicate detection and multiple-account reconciliation.
3. Calculation rules need official-source review and independent reference cases. `refund.ts` applies flat credit multipliers without comprehensive ceilings; `investmentFrom867` hardcodes dividend withholding to zero. Existing unit tests prove implementation behavior, not legal correctness.
4. Output is not filing-ready. Implement reviewed form selection, versioned official-field mappings, required attachments, and rendered-output verification. Do not advertise automatic filing or guaranteed refunds.
5. Missing-data detection is heuristic: absence of an investment document is not equivalent to an omitted required document. Derive requirements from confirmed user circumstances.
6. End-to-end coverage must exercise partial inputs, year changes, profile deselection, duplicate documents, scanned/unsupported PDFs, and printed warnings on mobile and desktop.

## Next implementation slice

Implement validated annual-case input and completeness states before expanding tax features. Block a refund headline when essential income or withholding is unknown; permit saving a clearly marked incomplete draft. Then resolve year/profile isolation and expand source-backed tax-rule coverage.

## Not verified in this audit

Production build, live exchange API, browser rendering, printed pagination, deployment, dependency security, and accuracy under Israeli tax law.

## Follow-up: input completeness gate

- Added missing/invalid/entered numeric states, including explicit zero and strict thousands separators.
- Selected income sources require their essential income and paid/withheld tax values before the combined estimate is calculated. Optional empty credits and expenses remain excluded; full eligibility/completeness certification is not implemented.
- Results show actionable missing-field links instead of a refund amount or printable financial summary when blocked.
- The calculation adapter also rejects invalid cases, excludes deselected investment and employee-credit inputs, and checks the year of 867/Flex results.
- Added 33 tests; full suite is now 138 passing tests and TypeScript passes.
- Browser check with synthetic data: withholding-only salary blocks the estimate; the correction link returns to employment; entering income restores the estimate.
- Still needed: full financial-input status controls, document provenance and stale Flex-result invalidation, multi-document reconciliation, official tax-rule review, and print/mobile verification.

## Follow-up: source-backed filing preparation (2026-09-08)

- Added a client-memory questionnaire for annual-case coverage, conditional document requirements and official source links. See ISRAEL-TAX-FILING-REQUIREMENTS.md for the research and release gaps.
- Replaced categorical filing-duty claims with candidate routes and explicit review states, including micro-business and separate rental reporting.
- Added 1325 transaction detail, conditional foreign-income/loss/spouse/benefits/property evidence, bank confirmation, and self-reported document status.
- Screen and print share the preparation boundary: unknown or unsupported facts suppress the combined estimate while allowing an incomplete preparation checklist. Neither output is an official filing form.
- Blocked combined estimates for 867 dividends whose withholding/origin are not fully represented by the current adapter.
- Browser/print visual verification for this change was blocked by the browser tool's usage-limit rejection; it must not be represented as passed.
