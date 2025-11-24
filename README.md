# Avandar

## Local development

### Prerequisites

1. Node.js
2. Docker Desktop
3. Supabase CLI

### Set up

1. Clone this repo

2. Initiate a local instance of Supabase (you need to have installed Supabase
   CLI for this)

   ```bash
   supabase start
   ```

   You should be able to access your local Supabase Studio at a URL provided
   in the output (most likely `http://localhost:54323`)

3. Set up your environment variables

   ```bash
   npm run env:reset
   ```

   This will create `.env.development` and `.env.development.edge` files which
   you will need to fill out.

   Next, fill in the necessary environment variables. For the Supabase
   variables, you should use the values you get from the output of running
   `supabase start` locally. If your local Supabase is already running, run
   `supabase status` to see your Supabase environment variables again.

4. Set up your local database

   ```bash
   npm run db:reset
   ```

   This will reset your Supabase database, apply all local migrations from
   the `supabase/migrations` directory, and then add the seed data from
   `seed/SeedConfig.ts`

5. Start the development server

   ```bash
   npm run dev
   ```

## Stack

- React
- Vite
- TypeScript
- Mantine
- TailwindCSS (this is on v3 because `eslint-plugin-tailwindcss` does not support
  v4 yet)
- React Query
- React Router
- Supabase

## Creating new CRUD models

### 1. DB schema changes

1. Create a SQL DB schema in `supabase/schemas`
2. Generate a new migration with `npm run db:new-migration your_migration_name`
3. Review that the generated migration makes sense and does what you need to.
4. Apply the new migration with `npm run db:apply-migrations`

### 2. Set up the TypeScript models

1. Generate the new types with `npm run db:gen-types`
2. Run `npm run new:model YourModel your_db_table_name` to create your new model
   with CRUD variants.

   This will create a new directory in `src/models/[YourModel]/` with the following
   files:

   - `types.ts`: All TypeScript types for this model. Only types should exist here,
     no actual runtime-executable code.
   - `parsers.ts`: All Zod schemas for this model. This file also includes
     Type-level tests to ensure the Zod schemas are consistent with the model types
     from the `types.ts` file.
   - `[YourModel]Client.ts`: API client for this model.

3. Update your model types in the `types.ts`. Make sure your frontend model's
   `Read`, `Insert`, and `Update` variants are correctly specified.

   - For `Insert`, our convention is to wrap the `Read` variant in
     `SetOptional<Required<ModelRead>, requiredFields>`. Meaning, we make the
     `Read` variant fully required, and then we specify the optional fields.
   - If your `Read` variant has a discriminated union, you will need sub-types for
     each part of the union, and then reference them in the `Insert` and `Update`
     variants. See [EntityFieldConfig.types.ts](src/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts)
     for an example. This is because if you apply `Partial<>` or `SetRequired<>` to
     the full object, TypeScript loses the discriminated union and treats it as a
     regular union. Splitting up the union into types and applying `Partial<>` or
     `SetRequired<>` to each sub-type allows us to maintain the discriminated union.

4. Set up the Zod schema parsers in `parsers.ts`.

   - Ensure the `DBRead`, `DBInsert`, and `DBUpdate` schemas match the model's
     database table in `src/types/database.types.ts`.
   - For the `DBInsertSchema` our convention is to call
     `DBReadSchema.required().partial({ fields })`. Meaning, we make the
     `DBReadSchema` fully required, and then we specify which fields are optional.
   - Ensure the frontend model's `ModelRead`, `ModelInsert`, and `ModelUpdate`
     schemas match the types in `types.ts`.
   - For the `ModelInsertSchema` our convention is to call
     `ModelReadSchema.required().partial({ fields })`. Meaning, we make the
     `ModelReadSchema` fully required, and then we specify which fields are
     optional.
   - Ensure there are no TypeScript errors being thrown in the
     `makeParserRegistry` line or in the type-level tests at the end of the file.

5. Verify there are no TypeScript errors in `[YourModel]Client.ts`.
