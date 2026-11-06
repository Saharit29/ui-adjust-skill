import type { ThemeOptions } from "@mui/material/styles";

export const typography: ThemeOptions["typography"] = {
  fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
  fontSize: 16,
  h1: { fontSize: 36, fontWeight: 700, lineHeight: 1.25 },
  h2: { fontSize: 30, fontWeight: 700, lineHeight: 1.3 },
  h3: { fontSize: 24, fontWeight: 600, lineHeight: 1.35 },
  h4: { fontSize: 20, fontWeight: 600, lineHeight: 1.4 },
  h5: { fontSize: 18, fontWeight: 600, lineHeight: 1.5 },
  h6: { fontSize: 17, fontWeight: 600, lineHeight: 1.5 },
  body1: { fontSize: 16, lineHeight: 1.6 },
  body2: { fontSize: 15, lineHeight: 1.6 },
  caption: { fontSize: 14, lineHeight: 1.5 },
  overline: { fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" },
  button: { fontSize: 15, fontWeight: 600, textTransform: "none" },
};
