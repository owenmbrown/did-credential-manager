import type { SnapConfig } from '@metamask/snaps-cli';
import { resolve } from 'path';
import * as dotenv from "dotenv"
dotenv.config()


const config: SnapConfig = {
  bundler: 'webpack',
  input: resolve(__dirname, 'src/index.tsx'),
  server: {
    port: 8080,
  },
  polyfills: {
    buffer: true,
  },
  environment: {
    INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID,
    COMPANION_APP_ORIGIN: process.env.COMPANION_APP_ORIGIN,
  },
};

export default config;
