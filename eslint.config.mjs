import coreWebVitals from "eslint-config-next/core-web-vitals"
import typescript from "eslint-config-next/typescript"

/** `next lint` was removed in Next 16 and `next build` no longer lints, so this
 *  config plus the "lint" script is our own responsibility.
 *
 *  eslint-config-next 16 ships native flat configs, so it is imported directly.
 *  Wrapping it in @eslint/eslintrc's FlatCompat -- the older idiom -- crashes
 *  with "Converting circular structure to JSON" while validating the legacy
 *  schema. */
const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/**"],
  },
]

export default config
