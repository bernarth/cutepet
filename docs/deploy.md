# Deploy

The SSR app runs as one Docker image on the owner's VPS with Coolify, behind Cloudflare. The same image serves QA and production. Only the environment variables change.

Placeholders: `<domain>` is the site domain, `<ref>` is the Supabase project ref, `<user>` is the GitHub account.

## Image

- `Dockerfile` at the repo root. It builds with pnpm in `node:24-slim`, then copies only `dist/cutepet` into `node:24-alpine`. The final image has no `node_modules` because the server bundle already includes its dependencies. It runs as the `node` user.
- The app listens on port **4000**.
- The image has a health check on `/robots.txt`. That route skips the Angular host check, so the check works from inside the container.
- No build-time variables. Every value below is read when the server starts.

## Environment variables

| Variable                   | QA value                    | Notes                                                                                                                    |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `SITE_URL`                 | `https://<domain>`          | Used for Open Graph URLs and the product links in WhatsApp messages                                                      |
| `SUPABASE_URL`             | `https://<ref>.supabase.co` |                                                                                                                          |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...`        | Dashboard → Project Settings → API Keys. The server refuses any value that does not start with `sb_publishable_`         |
| `TURNSTILE_SITE_KEY`       | `0x4AAAAAA...`              | Cloudflare → Turnstile → the widget's **Site Key** (public). Its **Secret Key** goes only in Supabase (see below)        |
| `NG_ALLOWED_HOSTS`         | `<domain>,www.<domain>`     | Angular SSR answers 400 to any other host                                                                                |
| `NO_INDEX`                 | `true`                      | Anything except `false` keeps search engines out: `robots.txt` disallows all, pages get `meta robots` and `X-Robots-Tag` |

- The server exits on start if `SITE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` or `TURNSTILE_SITE_KEY` is missing.
- The browser receives these values from `/runtime-config.js`, so they are public. Never put a secret here. Secrets belong only to Edge Functions.
- Locally, `pnpm start` uses the values in `src/environments/environment.development.ts`.

## Coolify

1. **New resource:** Projects → your project → environment → **+ New** → **Public Repository**.
2. **Repository:** `https://github.com/<user>/cutepet`, branch `main`.
3. **Build pack:** **Dockerfile**, base directory `/`, Dockerfile location `/Dockerfile`.
4. **Port:** Ports Exposes `4000`. Leave Ports Mappings empty, so the proxy is the only way in.
5. **Domains:** `https://<domain>,https://www.<domain>`. Coolify asks Let's Encrypt for both certificates. Under the redirect option, choose to redirect `www` to the bare domain, so customers always land on one host.
6. **Environment variables:** add the table above. Leave them as runtime variables: do not mark any as build variables (Coolify's "build time" option).
7. **Deploy** and open the Logs. The last line must be `Node Express server listening on http://localhost:4000`.

### Auto deploy on push

A public repository source has no GitHub App, so GitHub has to call Coolify with a webhook.

1. In the resource, **Advanced** → turn **Auto Deploy** on.
2. In the resource, **Webhooks** → GitHub: write a secret and copy the webhook URL.
3. GitHub → repo **Settings** → **Webhooks** → **Add webhook**: payload URL from step 2, content type `application/json`, the same secret, **Just the push event**.
4. Push a small change and check that a new deployment starts in Coolify.

### Roll back

- **Fast:** the resource's **Rollback** section lists the images of earlier deployments by commit. Pick the last good one and roll back. Coolify keeps only a few images, so this covers recent deployments only.
- **Durable:** `git revert <commit>` and push. Auto deploy builds the reverted code, and the history shows what happened.
- Database migrations are never rolled back by either option. A bad migration is fixed with a new migration. If a release needs a migration, push the migration first, and make sure the previous app version still works with the new schema.

## Cloudflare

Start with **DNS only**, so Let's Encrypt can reach the VPS and issue the first certificates.

1. Add the domain to Cloudflare and change the nameservers at the registrar to the ones Cloudflare gives.
2. DNS records, both **DNS only** (grey cloud):
   - `A` `@` → VPS IP
   - `A` `www` → VPS IP
3. Deploy in Coolify and check `https://<domain>` and `https://www.<domain>` in a browser. The certificate must be valid (issued by Let's Encrypt).
4. Turn both records to **Proxied** (orange cloud).
5. **SSL/TLS** → **Overview** → **Full (strict)**. Never "Flexible": it talks HTTP to the VPS and causes redirect loops.
6. **SSL/TLS** → **Edge Certificates** → turn on **Always Use HTTPS**.
7. Check again: site loads, the browser shows the Cloudflare certificate, and `curl -I https://<domain>/robots.txt` shows `x-robots-tag: noindex` during QA.

- Let's Encrypt renewals keep working through the proxy. If one fails, set both records to DNS only, redeploy, and set them back to Proxied.
- After changing an environment variable and redeploying, purge the Cloudflare cache if the browser still gets the old `/runtime-config.js`. It is sent with `Cache-Control: no-cache`.

## Supabase

**Authentication** → **URL Configuration** in the project used by this deployment:

- **Site URL:** `https://<domain>`
- **Redirect URLs:** `https://<domain>/**` and `https://www.<domain>/**`. Sign-in returns to the page where it started, on the same host.

Google sign-in keeps using the Supabase callback `https://<ref>.supabase.co/auth/v1/callback` as the redirect URI in Google Cloud. The domain does not change it.

**Anonymous sign-ins with Turnstile** (QR checkout creates a guest only when the customer starts paying):

1. Cloudflare dashboard → **Turnstile** → **Add widget**: hostnames `<domain>` and `www.<domain>`, mode **Managed**. Copy the **Site Key** and the **Secret Key**.
2. Supabase → **Authentication** → **Attack Protection** → **Enable CAPTCHA protection**: provider **Turnstile**, paste the **Secret Key**, save. The secret never goes in the repo or in Coolify.
3. Supabase → **Authentication** → **Sign In / Providers** → turn on **Allow anonymous sign-ins**.
4. Coolify: set `TURNSTILE_SITE_KEY` to the **Site Key** and redeploy.

Turn on the captcha before anonymous sign-ins, so there is no moment when guests can be created without it. Locally, `supabase/config.toml` enables Turnstile and reads `SUPABASE_AUTH_CAPTCHA_SECRET` from `supabase/.env` (gitignored). Use Cloudflare's always-pass test secret there (developers.cloudflare.com/turnstile/troubleshooting/testing). The development build already uses the matching always-pass site key.

## Database migrations

Run them from the repo root, against the project the deployment uses. `db push` never runs `supabase/seed.sql` unless `--include-seed` is passed, so never pass it.

```bash
supabase link --project-ref <ref>      # asks for the database password
supabase migration list --linked       # Local and Remote columns before the push
supabase db push --linked --dry-run    # prints what would be applied, changes nothing
supabase db push --linked
supabase migration list --linked       # every local migration now has a Remote version
```

Before the real push, check the dry-run output:

- It lists only the migrations missing from the Remote column of `migration list`, oldest first.
- It does not say `Remote migration versions not found in local migrations directory`. If it does, the remote has a migration the repo does not have: stop and find out why. Never fix it with `supabase migration repair` without understanding it.
- It does not mention seed data.
- Read any migration it lists that drops columns, types or policies, and confirm that the data it removes does not matter in that project.

Never run `supabase config push`: it would copy the local `config.toml` auth settings (localhost Site URL, local providers) to the remote project.
