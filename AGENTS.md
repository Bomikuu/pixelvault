# PixelVault development

- Implement the approved individual-to-individual lending design in docs/specs and docs/plans.
- Use graphify for scoped code relationships and jev-cli for sanitized advisory judgments; never submit secrets or personal records.
- Use Impeccable and the supplied PixelVault brand; root PRODUCT.md and DESIGN.md govern this app.
- Parallel agents may own nonoverlapping modules. Do not modify PixelCore, PixelFlow, Medframe or protected `/home/bomiku1/projects/dineEase-web`.
- Run targeted automated tests. PostgreSQL is mandatory for transactional tests. Mock external providers.
- No application builds, browser inspections, visual tests or manual app verification without an explicit request.
- Canonical interactive primitives live in packages/ui/src/components/ui; features use Shadcn. Run npm run check:ui after frontend changes.
- Prefer Tailwind utility classes directly in TSX for layout, typography, colors, responsive states, hover/focus and motion. Do not create feature-specific .css files when utilities can express the design. Keep shared semantic tokens and necessary canonical control foundations in their existing shared stylesheets.
- Follow explicit per-task verification instructions: when the user requests visual-only testing, perform only the authorized visual/browser review and do not run automated tests, check scripts or builds for that task.
- Never enable live origination or imply legal/provider approval. Test fixtures and simulated disbursement are labeled.
