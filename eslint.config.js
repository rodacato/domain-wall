import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      "packs/**/*.json",
      "eslint.config.js",
      ".dependency-cruiser.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      eqeqeq: ["error", "always"],
      "no-console": "error",
    },
  },
  {
    files: ["src/ui/**/*.{ts,tsx}", "src/main.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    files: ["scripts/**/*.ts", "*.config.ts", "*.config.js"],
    rules: { "no-console": "off" },
  },
);
