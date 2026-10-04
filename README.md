# Luxi Capture Studio

Social image and video studio for Luxi Capture clients, built on the Higgsfield
Studio template (Next.js 16) and the Higgsfield REST API (`https://api.higgsfield.ai`).

Run it: `pnpm install && cp .env.example .env.local && pnpm dev`, open
http://localhost:3000, click **Connect API key** and paste the key copied from
https://open.higgsfield.ai/api-keys. Each user's key is stored in an httpOnly cookie;
all authenticated calls stay on the server.

### Higgsfield SDK

Generation submits go through the official SDK, `@higgsfield/client/v2`
(server-only, `withPolling: false`, `maxRetries: 0` so a paid POST is never
re-sent). The SDK has no status, cancel or upload calls, so those use the REST
endpoints with the same `Authorization: Key KEY_ID:KEY_SECRET` header. A pasted
key without a colon falls back to plain REST for submits.

**Any model, from the terminal:** put `HF_CREDENTIALS=KEY_ID:KEY_SECRET` in
`.env.local`, then

```sh
pnpm hf <model-path> '<json input>'            # submits and waits for the result
pnpm hf bytedance/seedance-2.0/text-to-video '{"prompt":"A cinematic tracking shot","duration":5}' --no-wait
```

Take the model path and input schema from the model's API page on
https://open.higgsfield.ai/explore.

**In the app:** paste the key in **Connect API key**, or in local dev only set
`HF_CREDENTIALS` (or `HF_API_KEY_ID` + `HF_API_KEY_SECRET`) in `.env.local`.

The template's original documentation follows.

---

# Higgsfield app templates

Production-ready app templates on Next.js 16, Tailwind v4 and shadcn, generating
through the [Higgsfield platform API](https://api.higgsfield.ai). Shipped as
a [shadcn registry](https://ui.shadcn.com/docs/registry), so one command
scaffolds a project and one command adds a model.

Templates: **studio** (available now), preset and app-detail (next).

## One command, new project

Run from a directory that is not already a project:

```sh
# studio with every model
pnpm dlx shadcn@latest init -t next -n my-studio --no-monorepo -y higgsfield-ai/app-templates/studio

# studio with an empty model catalog
pnpm dlx shadcn@latest init -t next -n my-studio --no-monorepo -y higgsfield-ai/app-templates/studio-bare

# studio with a chosen set of models
pnpm dlx shadcn@latest init -t next -n my-studio --no-monorepo -y \
  higgsfield-ai/app-templates/studio-bare \
  higgsfield-ai/app-templates/seedance-2.5 \
  higgsfield-ai/app-templates/kling-3
```

Then:

```sh
cd my-studio && pnpm dev
```

Open http://localhost:3000, click **Connect API key** in the sidebar and paste the
API key copied from https://open.higgsfield.ai/api-keys. The key is stored
in an httpOnly cookie; authenticated platform calls stay on the server.
Reference uploads use the same key to obtain a signed Higgsfield storage URL.
The browser uploads directly with the returned headers, without receiving the
key. No separate storage account or token is required.

## Add or update models

`studio` installs the full catalog by default. When adapting the app, preserve
every installed model in its image/video picker unless the user explicitly asks
for a smaller catalog. If only some models have been tested against the live API,
report that limitation and keep the others available. See the model-preservation
rule in [AGENTS.md](AGENTS.md).

Every model is one file in `generation/catalog/models/`. The dev server watches
that directory and regenerates the barrel, so a freshly added model shows up in
the picker without a restart.

```sh
pnpm dlx shadcn@latest list   higgsfield-ai/app-templates
pnpm dlx shadcn@latest search higgsfield-ai/app-templates -q kling
pnpm dlx shadcn@latest add    higgsfield-ai/app-templates/seedance-2.5
pnpm dlx shadcn@latest add    higgsfield-ai/app-templates/models          # all of them
pnpm dlx shadcn@latest add    higgsfield-ai/app-templates/kling-3 --overwrite   # refresh
```

Pin a version with `#ref`: `higgsfield-ai/app-templates/studio#v1.0.0`.

## Environment

`shadcn init` writes these to `.env.local`:

| Variable                | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `HF_API_BASE_URL`       | Platform API base, prefilled with `https://api.higgsfield.ai` |

## Working on the templates

```sh
git clone git@github.com:higgsfield-ai/app-templates.git
cd app-templates && pnpm install && cp .env.example .env && pnpm dev
```

| Command               | What it does                                                    |
| --------------------- | --------------------------------------------------------------- |
| `pnpm dev`            | Dev server on :3000 (also serves the built registry at `/r/*`) |
| `pnpm typecheck`      | `tsc --noEmit`                                                  |
| `pnpm test`           | Credentials, uploads, and model input tests (Node.js 22.15+)    |
| `pnpm models`         | Regenerate the models barrel and `models/registry.json`         |
| `pnpm build`          | Production build (runs `pnpm models` first)                     |

Add a model: create `generation/catalog/models/<name>.ts` with a default export
(see any neighbour), run `pnpm models`, then
`pnpm exec shadcn registry validate ./registry.json`. Commit and push; GitHub
addresses resolve against the default branch.

Test the registry locally from another directory:

```sh
pnpm dlx shadcn@latest list http://localhost:3000/r/registry.json
pnpm dlx shadcn@latest add  http://localhost:3000/r/seedance-2.5.json
```

## Layout

```
app/                     Next.js App Router, globals.css, /api/upload signed URL route
layouts/studio.tsx       The Studio screen (read layouts/AGENTS.md)
components/studio/       Prompt dock, gallery, dialogs, presets (read components/studio/AGENTS.md)
components/ui/           shadcn primitives (Base UI)
generation/              Platform client, server actions, polling, stores
generation/catalog/      Model catalog: models/*.ts, mappers, generated barrel
lib/studio/              Browser-local history (IndexedDB), projects, uploads, useRuns
registry.json            shadcn registry root (studio, studio-bare; models are included)
scripts/sync-models.mjs  Regenerates the barrel + models registry
```

No `src/` directory, on purpose: the shadcn Next template uses a root layout,
and template files have to land on top of it.

`AGENTS.md` is the contract for agents adapting a scaffolded app.
