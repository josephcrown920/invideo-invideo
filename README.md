# Lantern

General-purpose AI video creation SaaS. InVideo is the functional baseline; this is an original implementation.

Not a music-video tool. Not an NBA Josh studio.

## Repo status

Target GitHub: `josephcrown920/invideo-agent-` (empty README on main). This working tree is the implementation. **This environment cannot push to GitHub.** Copy this folder onto a clone and commit from a machine with credentials.

Rename `gitignore.txt` → `.gitignore` and `env.example` → `.env.example` after copy.

## Quick start

```bash
pnpm install
docker compose up -d
cp env.example .env
pnpm db:migrate
pnpm dev
```

Web http://localhost:3100 — API http://localhost:3101/health

Empty vendor keys use mock providers. The agent still walks script → storyboard → generate → timeline → captions → render.
