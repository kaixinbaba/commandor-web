# commandor-web

Static landing page for [commandor.ai](https://commandor.ai), built with Vite and deployed to Cloudflare Pages.

```bash
pnpm install
pnpm build
pnpm dev
```

Production output is written to `dist/`.

## Release

**Push `main` to publish.** [GitHub Actions](https://github.com/kaixinbaba/commandor-web/actions/workflows/deploy.yml) installs the frozen pnpm lockfile, builds with Node.js 22, automatically releases `dist/` to the existing Cloudflare Pages project `commandor-web`, then verifies the production commit and every public file. PRs build only, without release credentials. Production runs are serialized to prevent older releases overwriting newer ones.

After committing reviewed changes, run `git push origin main` and wait for the workflow to succeed. Roll back with a reviewed revert commit on `main`; local Wrangler uploads are no longer the normal release path. Existing domains remain unchanged.

Repository configuration: Actions secret `CLOUDFLARE_API_TOKEN` (dedicated account-scoped Pages Edit credential) and variable `CLOUDFLARE_ACCOUNT_ID`. Never commit, log or share credential values. Renew the initial dedicated token before its 2027-10-13 expiry and replace the Actions secret. The existing project stays in Direct Upload mode; GitHub Actions provides the automatic Git-triggered release without migrating the site.
