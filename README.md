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

# Creating new models

If this is purely a frontend model with no DB persistence, then skip to step 3.

1. Create a SQL DB schema in `supabase/schemas`
2. Generate the new types with `yarn db:gen-types`
3. Run `yarn new:model YourModel [your_db_table_name]` to create your new model. If you only need a frontend model, don't include the db table name.
4. Set up your model types in the newly created `src/models/YourModel.ts`
5. If this model requires any server operations or backend persistence, set up the Zod schema parsers in `src/models/YourModelParsers.ts`
6. Configure the API Client with the appropriate arguments in `src/models/YourModelClient.ts`
7. Add any utility functions to `src/models/yourModelUtils.ts`
