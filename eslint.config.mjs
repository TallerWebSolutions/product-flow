import path from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  "plugin:react/recommended",
  "plugin:react-hooks/recommended",
  {
    parser: '@typescript-eslint/parser',
    ignorePatterns: ["node_modules"],
    rules: {
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];

export default eslintConfig;
