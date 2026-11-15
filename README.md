# JARVIS Backend

Node.js/TypeScript backend on Vercel Functions. Authenticates the JARVIS Android
app and proxies chat requests to NVIDIA NIM. **API keys never leave the server**
(PRD §8, §10).

> Planned as a **separate GitHub repository** — this folder is self-contained:
> move `backend/` out to its own repo root when pushing it (its CI workflow at
> `.github/workflows/ci.yml` is already relative to this folder).

## Endpoints (PRD §8)

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/v1/chat` | POST | Bearer | Chat completions (streaming SSE or JSON) |
| `/api/v1/models` | GET | Bearer | Allowed cloud models + default |
| `/api/v1/health` | GET | none | Availability check (`nvidiaConfigured` flag) |

## Environment variables

Set in Vercel → Project → Settings → Environment Variables (see `.env.example`):

| Variable | Required | Purpose |
| --- | --- | --- |
| `JARVIS_API_KEY` | yes | Shared secret the Android app sends as a Bearer token |
| `NVIDIA_API_KEY` | yes | NVIDIA NIM key (`nvapi-…`) |
| `ALLOWED_MODELS` | no | Comma-separated model allowlist (defaults built in) |
| `DEFAULT_MODEL` | no | Model used when the client sends none |
| `RATE_LIMIT_PER_MINUTE` | no | Requests per API key per minute (default 30) |

## Local development

```bash
npm install
npm run dev        # requires the Vercel CLI and a linked project
```

## Deploy

1. Import the repo in Vercel (Root Directory: the repo root — this folder *is* the project).
2. Add the environment variables above.
3. Deploy — endpoints are served from `/api/v1/*` automatically.

## Security behaviour

- Constant-time Bearer comparison; tokens are never logged.
- Rate limiting per API key (per serverless instance — adequate for MVP).
- Strict request validation: roles, sizes, parameter ranges.
- Model allowlisting; unknown model ids are rejected.
- Upstream (NVIDIA) error bodies are never forwarded — only mapped statuses.

## Android side

The app's Settings → **Cloud backend** section stores the deployed URL and the
`JARVIS_API_KEY` value; `NimAssistantEngine` streams replies through
`/api/v1/chat`. The NVIDIA key is only in this backend's environment.
