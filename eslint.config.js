import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "**/src-tauri/target/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"] ,
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { "no-console": "warn" }
  }
);
