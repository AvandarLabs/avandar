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

7. Update your logo in `public/`. If your logo is a PNG (not an svg), update the filename in `src/config/AppConfig.ts`.

8. Update everything you need in `src/config/AppConfig.ts`.

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

# Vite stuff

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactDom from "eslint-plugin-react-dom";
import reactX from "eslint-plugin-react-x";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```
