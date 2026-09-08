# Dependency security maintenance

Updated: 2026-09-09.

## Changes

- Updated fast-xml-parser 4.5.1 to 5.11.1, Vitest 2.1.8 to 3.2.7, Next.js 15.5.23 to 16.3.4, and PostCSS 8.5.1 to 8.5.28.
- Refreshed affected transitive dependencies through the lockfile, without `npm audit fix --force` or dependency overrides.
- Set the Node minimum to 22.12.0 and aligned Node type definitions with Vite's peer requirements. Verification used Node 24.16.0; the minimum-version runtime was not separately tested.
- Retained Webpack explicitly for development and production, avoiding an unrelated bundler migration for the existing PDF worker integration.
- Removed the obsolete `next lint` command. No ESLint setup previously existed; `typecheck` is not a replacement for lint rules.
- Reject DOCTYPE and ENTITY declarations before parsing Flex XML. These are unnecessary for supported reports. This conservative guard can also reject declaration-like text inside comments; standard XML character references remain supported.

## Evidence and limits

- Initial npm audit: 12 affected dependencies, including two critical findings.
- After updates: npm reports zero known vulnerabilities in the installed dependency tree, including development dependencies. This is a point-in-time advisory result, not a security certification.
- Regression suite: 168 tests passed, including five new declaration/escaped-character cases and the existing USD/EUR/ILS Flex fixture.
- Production Webpack build completed successfully on Next.js 16.3.4, including TypeScript validation. The required automatic JSX runtime and development-type include changes were retained in tsconfig.json.
- No real customer reports or credentials were added to tests or uploaded during validation.
- Tax-rule correctness, complete filing readiness, browser PDF extraction and rendered print layouts are separate validation requirements; dependency updates do not certify them.

## Maintenance

Use the repository root (one directory above MVP), run `npm ci`, `npm audit`, `npm test`, `npm run build`, and `npm run typecheck`. Review dependency changes and repeat client-side PDF and XML import checks before release. Do not bypass audit failures with `--force` without evaluating the resulting upgrades.

Sources: [Next.js 16 migration](https://nextjs.org/docs/app/guides/upgrading/version-16), [fast-xml-parser changelog](https://github.com/NaturalIntelligence/fast-xml-parser/blob/master/CHANGELOG.md). Specific affected versions were checked against npm's live advisory endpoint and package metadata.
