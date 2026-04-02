import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  {ignores: ["web/**", "dist/**", "node_modules/**", ".claude/**", "out/**", "scrapers/myChart/clo-to-jpg-converter/**", "sample_data/**", "pdfs/**", "fake-mychart/**", "openclaw-plugin/dist/**", "*.config.*", "*.js"]},
  {files: ["**/*.{ts}"]},
  {languageOptions: { globals: globals.node }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {rules: {"@typescript-eslint/no-explicit-any": "error"}},
];
