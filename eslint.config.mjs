import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/*
 * `next/core-web-vitals` (and the rest of eslint-config-next) still ships
 * as a legacy, non-flat config. `FlatCompat` translates it into flat-config
 * form so it keeps working under ESLint 9, which dropped support for
 * `.eslintrc*` entirely (that's why `next lint` was failing outright rather
 * than reporting real issues -- see README "Known limitations").
 */
const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    {
        ignores: [
            "node_modules/**",
            ".next/**",
            "out/**",
            "build/**",
            "next-env.d.ts",
        ],
    },
    ...compat.extends("next/core-web-vitals"),
];

export default eslintConfig;
