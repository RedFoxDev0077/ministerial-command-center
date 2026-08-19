# CI/CD Setup — Automatic Deployment

Pushing to `master` builds both apps and deploys them to the production VPS via
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml). The result
appears on the **Actions** tab, with a summary table on every run.

Nothing deploys until the secrets below exist. Follow this once.

---

## 1. Create a deploy key

Generate a **dedicated** key pair for CI. Do not reuse a personal key, and do not
put a passphrase on it (Actions cannot type one).

Run locally:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/ministerial_deploy -N ""
```

That produces two files:

| File | Goes to |
|---|---|
| `~/.ssh/ministerial_deploy.pub` | the **server** |
| `~/.ssh/ministerial_deploy` | the **GitHub secret** (private — never commit) |

Install the public half on the VPS:

```bash
ssh-copy-id -i ~/.ssh/ministerial_deploy.pub root@2.25.130.246
```

Verify it works before going further:

```bash
ssh -i ~/.ssh/ministerial_deploy root@2.25.130.246 'echo ok'
```

---

## 2. Add the repository secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Required | Value |
|---|---|---|
| `VPS_HOST` | yes | `2.25.130.246` |
| `VPS_USER` | yes | `root` |
| `VPS_SSH_KEY` | yes | the **entire** contents of `~/.ssh/ministerial_deploy`, including the `-----BEGIN…` and `-----END…` lines |
| `VPS_PORT` | no | SSH port, if not `22` |
| `VPS_SSH_KNOWN_HOSTS` | recommended | output of `ssh-keyscan -H 2.25.130.246` |

To copy the private key on Windows:

```bash
clip < ~/.ssh/ministerial_deploy
```

`VPS_SSH_KNOWN_HOSTS` pins the server's host key. Without it the workflow falls
back to `ssh-keyscan` on every run, which trusts whatever answers on first
contact — a small but real MITM window. Setting it closes that.

### Optional variable

**Settings → Secrets and variables → Actions → Variables**

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `/api` | Frontend API base. The default is correct — nginx proxies `/api` to `localhost:3000`. Only change it if the API moves to another host. |
| `SITE_URL` | *(unset)* | Public URL, e.g. `https://hoclaespa.com`. Used by the post-deploy check that confirms the site actually serves the bundle this run built. Strongly recommended: without it that end-to-end check is skipped and a silent non-deploy can still look green. |

### Deploy verification

After the health check, the pipeline asserts the release really landed:

1. the built bundle exists on the server, and
2. `SITE_URL` serves an `index.html` referencing that exact bundle.

Either mismatch fails the run. This exists because a deploy once stopped running
entirely while every push still reported success — fixes sat in git for hours
while production served an old build.

---

## 3. Server prerequisites

The workflow assumes the layout the existing deployment already uses:

```
/var/www/ministerial-command-center/          <- frontend (nginx root)
/var/www/ministerial-command-center/backend/  <- API
                                     ├── .env       (MUST exist — never deployed)
                                     └── uploads/   (user files — never touched)
```

The server needs `node` 20+, `npm`, `pm2`, `rsync` and — only if you use the
search migration — `psql`. Check:

```bash
ssh root@2.25.130.246 'node -v; npm -v; pm2 -v; rsync --version | head -1; psql --version'
```

`backend/.env` is **never** uploaded by CI. It stays on the server and is the
only place production secrets live. If it is missing, the deploy fails loudly
rather than starting an API with no configuration.

---

## 4. What a deploy does

1. **Build** — installs both dependency trees, generates the Prisma client,
   typechecks and builds. The backend typecheck **blocks** the deploy; the
   frontend typecheck only reports (it has pre-existing errors and `strict` is
   off, so blocking on it would stop every deploy).
2. **Back up** — one rolling copy of the current release to `.backup/`.
3. **Upload** — frontend via `rsync --delete` (excluding `backend/`, `uploads/`
   and `.backup/`), backend without `--delete` so `.env`, `uploads/` and
   `node_modules/` survive.
4. **Install** — `npm ci --omit=dev` on the server. `node_modules` is **not**
   shipped from CI: `bcrypt`, `sharp` and `ffmpeg-static` are native and must be
   compiled for the target host.
5. **Restart** — `pm2 reload` if the process exists, else `pm2 start`.
6. **Health check** — polls `/api/health` for 30s.
7. **Roll back** — if the health check fails, the previous backend build is
   restored and the run is marked failed.

Two deploys never run at once, and a deploy is never cancelled midway.

---

## 5. Database changes are deliberately manual

Schema changes do **not** run automatically. This is a document-of-record system
for a ministry; `prisma db push` can drop columns, and an automatic one on every
green build is how a production table quietly loses data.

To apply them, use **Actions → CI/CD — Build & Deploy → Run workflow**:

| Input | When to use |
|---|---|
| `apply_search_migration` | Applies `prisma/sql/001_document_search_vector.sql`. Idempotent and safe — run this once. Until you do, document search silently falls back to a slower substring match. |
| `apply_schema_push` | Runs `prisma db push`. **Can drop columns and data.** Take a database backup first. |

There is no `prisma/migrations/` directory, so schema state is managed by
`db push` rather than a migration history. Generating a proper baseline
migration is worth doing before this system holds real records.

---

## 6. First run

1. Add the secrets from step 2.
2. **Actions → CI/CD — Build & Deploy → Run workflow**, tick
   `apply_search_migration`, and run it against `master`.
3. Watch the summary table. On success, check the site and `/api/health`.

After that, every push to `master` deploys automatically. Markdown-only changes
are skipped.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `VPS_SSH_KEY and VPS_HOST secrets must be set` | Secrets missing or misnamed. |
| `Permission denied (publickey)` | Public half not installed on the server, or `VPS_USER` is wrong. Re-run `ssh-copy-id`. |
| `backend/.env is missing on the server` | Create it from `backend/.env.example` with real values. |
| Health check fails immediately | The API validates its environment on boot and exits on a missing, too-short or placeholder `JWT_SECRET`. Check `pm2 logs ministerial-api`. |
| Frontend deploys but API calls 404 | nginx `/api` proxy not configured — see `deployment/nginx-config.conf`. |
| Native module errors after deploy | Delete `backend/node_modules` on the server and re-run; `npm ci` will rebuild them. |
