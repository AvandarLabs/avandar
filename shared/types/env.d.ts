/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface ImportMetaEnv {
    BASE_URL: string;
    MODE: string;
    DEV: boolean;
    PROD: boolean;
    SSR: boolean;
    [key: string]: any;
  }

  interface ImportMeta {
    readonly env?: ImportMetaEnv;
  }
}

export {};
