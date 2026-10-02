import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves the site under /<repository>/; local development serves it at the root.
export default defineConfig({
  base: process.env["GITHUB_PAGES"] === "true" ? "/domain-wall/" : "/",
  plugins: [react()],
});
