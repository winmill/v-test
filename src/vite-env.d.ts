/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLET_CONNECT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
