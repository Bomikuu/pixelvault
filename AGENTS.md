# PixelVault development

- Implement the approved individual-to-individual lending design in docs/specs and docs/plans.
- Use graphify for scoped code relationships and jev-cli for sanitized advisory judgments; never submit secrets or personal records.
- Use Impeccable and the supplied PixelVault brand; root PRODUCT.md and DESIGN.md govern this app.
- Parallel agents may own nonoverlapping modules. Do not modify PixelCore, PixelFlow, Medframe or protected `/home/bomiku1/projects/dineEase-web`.
- Run targeted automated tests. PostgreSQL is mandatory for transactional tests. Mock external providers.
- No application builds, browser inspections, visual tests or manual app verification without an explicit request.
- Canonical interactive primitives live in packages/ui/src/components/ui; features use Shadcn. Run npm run check:ui after frontend changes.
- Never enable live origination or imply legal/provider approval. Test fixtures and simulated disbursement are labeled.
