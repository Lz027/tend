import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const deployPreset = process.env["NITRO_PRESET"] || (process.env["NETLIFY"] ? "netlify" : "");

export default defineConfig({
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
    ...(deployPreset ? [nitro({ preset: deployPreset })] : []),
  ],
  resolve: { alias: { "@": "/src" } },
  server: { host: "::", port: 8080, strictPort: true },
});
