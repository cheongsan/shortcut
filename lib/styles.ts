/** The shell's max content width, shared by the header, <main> and the footer.
 *
 *  It is deliberately the width of the WIDEST thing on the site -- the
 *  destination card (max-w-2xl, 672px) -- rather than a page-sized 1120px.
 *  With a 1120px shell the logo sat 130px to the left of the 448px key panel
 *  and the theme toggle 272px to its right on a 1280px screen, so the three
 *  elements read as unrelated things scattered across an empty page. Clamping
 *  the chrome to the content width pulls them into one cluster, and on the
 *  destination-card screen the logo and toggle line up exactly with the card's
 *  edges.
 *
 *  Defined once because three files use it and this is precisely the kind of
 *  value that drifts. */
export const SHELL_WIDTH = "mx-auto w-full max-w-2xl"
