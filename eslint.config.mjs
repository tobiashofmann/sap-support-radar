import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				sap: "readonly"
			},
			ecmaVersion: 2023,
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname
			}
		}
	},
	{
		// scripts/** runs under plain Node.js (via ts-node), not a browser - override
		// the browser globals above with Node ones for this subtree. parserOptions.project:
		// true (above) auto-discovers scripts/tsconfig.json for these files, since it's
		// the nearest enclosing tsconfig.json.
		files: ["scripts/**/*.ts"],
		languageOptions: {
			globals: {
				...globals.node
			}
		}
	},
	{
		// Playwright e2e suite (tests/e2e/**), like the existing WebdriverIO one
		// (webapp/test/e2e/**), isn't part of tsconfig.json's "include" and is
		// kept out of the main lint/build pipeline for the same reason.
		// pam-mcp-server/** is a separate package with its own tsconfig.json/build
		// (see ADR 0007) - excluded here so parserOptions.project: true doesn't
		// auto-discover its tsconfig (or lint its gitignored dist/ build output);
		// it would need its own lint setup if desired.
		ignores: [
			"eslint.config.mjs",
			"webapp/test/e2e/**",
			"tests/e2e/**",
			"playwright.config.ts",
			"pam-mcp-server/**",
			"dist/**",
			"docs/**",
			"coverage/**",
			"allure-results/**",
			"allure-report/**",
			"playwright-report/**",
			"test-results/**",
			".nyc_output/**"
		]
	}
);
