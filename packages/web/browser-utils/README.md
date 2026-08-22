# @avandar/browser-utils

Browser/DOM utilities (OPFS, navigation, storage persistence, platform detection) for the Avandar web app.

ESM only. Requires Node 22+ and a browser environment.

## Install

```sh
pnpm add @avandar/browser-utils
```

No peer dependencies.

## API

All functions are named exports from the package root.

### OPFS (Origin Private File System)

| Function                      | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `clearOpfs()`                 | Removes every entry from the origin private file system |
| `removeOpfsFile(name)`        | Removes a single file, ignoring a missing file          |
| `ensureOpfsWritePermission()` | Resolves once OPFS is writable, rejecting if it is not  |

### Storage persistence

| Function                          | Description                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| `ensureLocalStoragePersistence()` | Asks the browser to mark storage persistent so it is not evicted |

### URL and navigation

| Function                     | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `getCurrentUrl()`            | The current page URL                              |
| `navigateToExternalUrl(url)` | Navigates the top-level window to an external URL |

### Platform and connectivity

| Function             | Description                                |
| -------------------- | ------------------------------------------ |
| `getIsOnline()`      | Whether the browser reports network access |
| `getIsMacPlatform()` | Whether the current platform is macOS      |

These wrap browser APIs that are awkward to call directly, are inconsistently
supported, or need a guard for non-browser environments (server-side rendering,
tests). They read the DOM and `navigator`, so they must run in a browser.

## License

MIT
