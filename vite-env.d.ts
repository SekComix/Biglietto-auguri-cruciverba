/// <reference types="vite/client" />

declare const process: {
  env: {
    readonly API_KEY: string;
    [key: string]: string | undefined;
  }
};
