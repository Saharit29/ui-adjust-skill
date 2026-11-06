import type { PaletteOptions } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    neutral: Palette["primary"];
  }
  interface PaletteOptions {
    neutral?: PaletteOptions["primary"];
  }
}

const brand = "#0F766E";
const ink = "#101828";
const inkSoft = "#475467";

export const palette: PaletteOptions = {
  mode: "light",
  primary: { main: brand, dark: "#115E59", light: "#E6F4F1", contrastText: "#FFFFFF" },
  secondary: { main: "#6941C6", light: "#F4F3FF", contrastText: "#FFFFFF" },
  error: { main: "#B42318", light: "#FEF3F2", dark: "#912018", contrastText: "#FFFFFF" },
  warning: { main: "#B54708", light: "#FFFAEB", contrastText: "#FFFFFF" },
  success: { main: "#067647", light: "#ECFDF3", contrastText: "#FFFFFF" },
  info: { main: "#175CD3", light: "#EFF8FF", contrastText: "#FFFFFF" },
  neutral: { main: inkSoft, dark: "#344054", contrastText: "#FFFFFF" },
  text: { primary: ink, secondary: inkSoft, disabled: "#98A2B3" },
  background: { default: "#F9FAFB", paper: "#FFFFFF" },
  divider: "#EAECF0",
};
