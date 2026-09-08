/** Tailwind 4 split its PostCSS plugin out of `tailwindcss` into
 *  `@tailwindcss/postcss`. Turbopack (the Next 16 default) reads this file.
 *  No autoprefixer / postcss-import: Tailwind 4 bundles Lightning CSS, which
 *  handles @import inlining, nesting and vendor prefixing itself. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}

export default config
