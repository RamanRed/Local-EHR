## Description
Provide a concise explanation of what this pull request introduces or fixes.

Fixes #(issue number)

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds clinical/technical capability)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] DevOps / CI/CD / Infrastructure update
- [ ] Documentation update

## Areas Impacted
- [ ] `@vox/server` (Express API, Prisma, AI pipeline)
- [ ] `@vox/web` (React UI, routes, RoleGuard)
- [ ] `@vox/shared-types` (DTOs, interfaces)
- [ ] `terraform/` / `ansible/` / `k8s/` (Infrastructure & deployment)

## Quality & Verification Checklist
- [ ] My code follows the style guidelines of this project.
- [ ] I have performed a self-review of my own code.
- [ ] I have commented my code where necessary, especially in complex clinical calculations or AI prompts.
- [ ] `pnpm build` completes without TypeScript or Vite errors.
- [ ] Relevant unit tests have been added and all automated tests pass.
- [ ] No secrets or private keys are committed in this PR.
- [ ] Documentation has been updated accordingly.
