# Mivo

Mivo is an AI-powered content editor for structured marketing content. It uses TipTap for rich editing, OpenAI for outline and block generation, and a Next.js + Postgres backend for document persistence, uploads, and version history.

## Demo

Watch the demo video: [Getting Started with Mivo AI](https://www.tella.tv/video/getting-started-with-mivo-ai-ev36)

## Product Overview

- TipTap-based editor with custom block nodes and React node views.
- AI generation for `social_post`, `blog_post`, and `landing_page`.
- Structured output designed for renderable editorial and layout blocks, not plain text dumps.
- Progressive rendering via server-sent events, outline placeholders, per-block previews, and block completion events.
- Attachment uploads for text, Markdown, PDF, and DOCX with semantic retrieval for generation grounding.
- Dedicated preview flow backed by the same document schema.
- Selection-based micro-revision workflow.
- Version history with checkpointed storage and historical preview.

## What The App Does

- Create a draft for a social post, blog post, or landing page.
- Generate structured content into the editor from a prompt.
- Stream generation progressively instead of waiting for the full document.
- Upload attachments, chunk and embed them, and use semantically retrieved context during draft generation.
- Preview the current draft or a historical version.
- Save point-in-time versions with checkpointed storage.
- Highlight text and request a targeted rewrite.

## Stack

- Next.js 16
- React 19
- TypeScript
- TipTap
- Zod
- OpenAI Responses API
- Postgres
- Drizzle ORM
- Better Auth
- Tailwind CSS 4
- Radix UI Themes
- Framer Motion

## Local Setup

### Prerequisites

- Node.js 20+
- `pnpm`
- Postgres
- OpenAI API key

### Environment

Create a `.env` file from `.env.example` and fill in the values:

```bash
cp .env.example .env
```

Required values:

- `OPENAI_API_KEY`
- `DATABASE_URL`

Optional overrides:

- `OPENAI_MODEL_DEFAULT`
- `OPENAI_MODEL_COMPLEX`
- `OPENAI_MODEL_IMAGE`
- `OPENAI_EMBEDDING_MODEL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

### Install and Run

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Then open `http://localhost:3000`.

## Useful Commands

```bash
pnpm dev
pnpm lint
pnpm build
pnpm db:migrate
pnpm db:generate
```

## Data and Storage Notes

- Uploaded attachment files and generated images are stored in Postgres-backed asset storage.
- Documents, version metadata, attachment metadata, chunk text, and chunk embeddings live in Postgres.
- Version history uses periodic checkpoints plus JSON patches for later versions.

## Project Structure

```text
app/                    Next.js routes and API handlers
components/             Editor, workspace, landing, and UI components
lib/ai/                 LLM client, prompts, generation orchestration
lib/db/                 Drizzle setup and schema
lib/schema/             Content schemas and TipTap document transforms
lib/records.ts          Persistence, versions, jobs, attachments
drizzle/                SQL migrations and snapshots
```

## Known Gaps / Honest Notes

- Micro-revision currently tracks the selected text, but not a stable editor range. If focus changes before the rewrite returns, replacement can target the wrong location.
- Semantic retrieval is currently used for draft generation only; rewrite and mutation flows still ignore attachment retrieval.
- AI generation updates the live canvas immediately, but the user still has to create a version to persist the generated draft explicitly.

## Verification

This repo currently passes:

- `pnpm lint`
- `pnpm build`

## Architecture

See [docs/architecture.md](docs/architecture.md) for the design overview, request flow, tradeoffs, and improvement list.
