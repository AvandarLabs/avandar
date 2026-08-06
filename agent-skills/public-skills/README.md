# Agent Skills by Avandar

This directory contains skills written by the Avandar team that can be useful to
the general public. This means that they do not rely on Avandar-specific or
repo-specific code.

These skills are more useful if you are using public Avandar libraries (npm
packages under the `@avandar` namespace), but they are not required.

## Installation

Install all of these skills with [`npx skills`](https://www.npmjs.com/package/skills):

```bash
npx skills add https://github.com/AvandarLabs/avandar/tree/develop/agent-skills/public-skills/skills
```

To install a specific skill, point at its directory:

```bash
npx skills add https://github.com/AvandarLabs/avandar/tree/develop/agent-skills/public-skills/skills/supabase-declarative-schema
```

## Available Skills

### supabase-declarative-schema

Enforces a declarative schema workflow for Supabase database changes. Instead of
manually writing migration files, you define the desired state in
`supabase/schemas/*.sql` files and generate migrations with `supabase db diff`.

This skill takes priority over the base `supabase` skill for all schema-related
operations.

**Key workflow:**

1. Define schema in `supabase/schemas/*.sql`
2. Run `supabase stop`
3. Run `supabase db diff -f <migration_name>`

### ava-model-creation

Documents Avandar's conventions for creating new models with the Ava CLI,
including `shared/models`, `src/models`, Supabase-backed CRUD models,
Dexie-backed browser models, parsers, schema migrations, and client wiring.

### avandar-code-review

Provides an Avandar-specific code review checklist for general, TypeScript, and
SQL conventions, including the most common review mistakes around functional
programming, readonly placement, naming, typecheck, and linting.

## Adding Skills

Each skill lives in its own directory under `skills/` and contains a `SKILL.md`
file with frontmatter metadata and agent instructions.

## License

MIT. See [`LICENSE`](./LICENSE).
