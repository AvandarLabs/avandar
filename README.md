# SaaS App Scaffold

## Set up

1. Run the following in your terminal

```
git clone https://github.com/jps327/saas-app-template.git [YOUR_REPO_NAME]
cd [YOUR_REPO_NAME]
yarn install
git remote remove origin
git remote add upstream https://github.com/jps327/saas-app-template.git
cp .env.example .env.development
```

2. Create a repo in GitHub and point this directory to your newly created repo

```
git remote add origin [REPO_GIT_URL].git
git branch -M main
git push -u origin main
```

3. Initiate a local instance of Supabase

```
npx supabase start
```

(If a local instance of Supabase is already running for a different project
you will need to stop it first. Navigate to the directory associated with
the other Supabase container and run `npx supabase stop`)

4. Open `.env.development` file and update your Supabase keys (output from step 3). Also change the Vite app URL if necessary.

5. Set your package name in `package.json`

6. Set your app name in `index.html`

7. Update the project id in `supabase/config.toml` and change the port if you don't want it to clash with other local supabase instances.

8. Update your logo in `public/`. If your logo is a PNG (not an svg), update the filename in `src/config/AppConfig.ts`. Also update the filename in `index.html`

9. Update everything you need in `src/config/AppConfig.ts`.

## Stack

- React
- Vite
- TypeScript
- Mantine
- TailwindCSS
- React Query
- React Router
- Supabase

# Notes

- TailwindCSS is on v3 because eslint-plugin-tailwindcss does not support v4 yet.
- Public files are in public/. Change the logo there. Just replace logo.svg with your logo (png, svg, whatever).
- Public files are importable using / in vite.
- Images, pngs, svgs, are importable from assets directly.

# Creating new CRUD models

## 1. DB schema changes

1. Create a SQL DB schema in `supabase/schemas`
2. Generate a new migration with `yarn db:new-migration your_migration_name`
3. Review that the generated migration makes sense and does what you need to.
4. Apply the new migration with `yarn db:apply-migration`

## 2. Set up the TypeScript models

1. Generate the new types with `yarn db:gen-types`
2. Run `yarn new:model YourModel your_db_table_name` to create your new model with CRUD variants.

This will create a new directory in `src/models/[YourModel]` with the following files:

- `[YourModel].types.ts`: All TypeScript types for this model. Only types should exist here, no actual runtime-executable code.
- `[YourModel]Parsers.ts`: All Zod schemas for this model. This file also includes Type-level tests to ensure the Zod schemas are consistent with the model types from the `[YourModel].types.ts` file.
- `[YourModel]Client.ts`: API client for this model.

3. Update your model types in the `[YourModel].types.ts`. Make sure your frontend model's `Read`, `Insert`, and `Update` variants are correctly specified.

- For `Insert`, the convention is to wrap the `Read` variant in `SetRequired<Partial<Read>, requiredFields>`. Meaning, we make the `Read` variant fully optional, and then we specify the required fields.
- If your `Read` variant has a discriminated union, you will need sub-types for each part of the union, and then reference them in the `Insert` and `Update` variants. See [EntityFieldConfig.types.ts](src/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts) for an example. This is because if you apply `Partial<>` or `SetRequired<>` to the full object, TypeScript loses the discriminated union and treats it as a regular union. Splitting up the union into types and applying `Partial<>` or `SetRequired<>` to each sub-type allows us to maintain the discriminated union.

4. Set up the Zod schema parsers in `[YourModel]Parsers.ts`.

- Ensure the `DBRead`, `DBInsert`, and `DBUpdate` schemas match the model's database table in `src/types/database.types.ts`.
- Ensure the frontend model's `Read`, `Insert`, and `Update` schemas match the types in `[YourModel].types.ts`.
- In total, there should be 6 schemas.
- Ensure there are no TypeScript errors being thrown in the `makeParserRegistry` line or in the type-level tests at the end of the file.

5. Verify there are no TypeScript errors in `[YourModel]Client.ts`.
