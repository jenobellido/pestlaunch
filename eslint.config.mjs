import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Architecture boundaries — see ARCHITECTURE.md.
  {
    files: ["shared/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@/core/**", "@/modules/**", "@/app/**"], message: "shared/ must not depend on core, modules or app." }],
      }],
    },
  },
  {
    files: ["core/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@/modules/**", "@/app/**"], message: "core/ must not depend on modules or app." }],
      }],
    },
  },
  {
    files: ["modules/**"],
    ignores: ["modules/registry.ts", "modules/registry.server.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@/modules/**", "@/app/**"], message: "A module must not import other modules. Use relative imports inside your own module; share code via shared/ or core/." }],
      }],
    },
  },
  {
    files: ["app/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["@/modules/*/**", "!@/modules/registry", "!@/modules/*/server"], message: "Import a module through its public API (@/modules/<name> or @/modules/<name>/server), not its internal files." }],
      }],
    },
  },
  // CommonJS loaders for command-line scripts (scripts/*.cjs) have to use require().
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local agent worktrees (not in git).
    ".claude/**",
  ]),
]);

export default eslintConfig;
