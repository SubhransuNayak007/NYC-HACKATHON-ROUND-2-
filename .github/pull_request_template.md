# Release Readiness Pull Request Template

## Description
<!-- Provide an executive summary of the changes introduced in this PR -->

## Related Issues / Spec
- Fixes #
- Spec: Landing Page & Multi-Viewport Release Gate

---

## 🛑 DevOps 15-Gate Release-Readiness Checklist
All checks must be verified before merging into `develop` or `main`:

- [ ] **1. Git & Codebase Integrity:** Feature branch created from clean develop; no `.env*` or credentials committed.
- [ ] **2. Code Quality & Linting:** `npx eslint --quiet` passes with 0 errors.
- [ ] **3. TypeScript Type Safety:** `npx tsc --noEmit` passes with 0 compiler errors.
- [ ] **4. Build Verification:** `npm run build` succeeds without build-time or hydration errors.
- [ ] **5. Functional E2E Tests:** Playwright suite passes across Desktop (1440x900) and Mobile (393x852).
- [ ] **6. API & Backend Security:** All route handlers enforce authentication, rate limits, and Zod input validation.
- [ ] **7. Database & Queue Safety:** No unreviewed destructive migrations; connection retries handled.
- [ ] **8. Secrets Hygiene:** Dependency audit clean; zero hardcoded API keys.
- [ ] **9. Performance & Core Web Vitals:** 0 console preload warnings; animations 60fps without memory leaks.
- [ ] **10. Responsive Layouts:** 0 horizontal overflow; no clipped elements on 393px mobile.
- [ ] **11. Environment Parity:** All variables documented in `.env.example`; runtime validator updated.
- [ ] **12. Automated CI Passes:** GitHub Actions Release Gate is green.
- [ ] **13. Code Review & Approval:** At least one peer review approved.
- [ ] **14. Staging Smoke Test:** Post-deploy probe (`scripts/smoke-test.js`) returns HTTP 200.
- [ ] **15. Rollback Plan Ready:** Documented recovery commit/tag in case of regression.

## Rollback Procedure
If a critical regression occurs in staging/production:
```bash
git revert -m 1 <commit-hash>
git push origin develop
```
