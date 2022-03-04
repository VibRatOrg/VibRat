import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();


let serverOptions = {};
if (process.env.NODE_ENV === "development") {
  serverOptions = {
    server: {
      port: 443,
      https: {
        key: readFileSync(
          process.env.HTTPS_CERTIFICATE_KEY_FILENAME_PATH,
          "ascii"
        ),
        cert: readFileSync(
          process.env.HTTPS_CERTIFICATE_FILENAME_PATH,
          "ascii"
        ),
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss()],
  ...serverOptions,
  assetsInclude: ['assets/**/*.svg', 'assets/**/*.png', 'sw.js']
})
