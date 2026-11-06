import { alpha, createTheme } from "@mui/material/styles";

const dense = {
  primary: "#0F766E",
  primaryHover: "#0D9488",
  text: "#1D2939",
  textSecondary: "#344054",
  textDisabled: "#667085",
  border: "#D0D5DD",
  canvas: "#F2F4F7",
  surface: "#FFFFFF",
  selected: "#E6F4F1",
  error: "#B42318",
  warning: "#B54708",
  success: "#067647",
} as const;

/**
 * Compact theme for data-heavy screens (tables, detail pages). Applied by <DenseSection> through a
 * nested ThemeProvider — everything rendered inside it (dialogs and menus included) uses these values.
 */
export const denseTheme = createTheme({
  spacing: 8,
  shape: { borderRadius: 8 },
  palette: {
    primary: { main: dense.primary, light: dense.selected, contrastText: "#FFFFFF" },
    text: { primary: dense.text, secondary: dense.textSecondary, disabled: dense.textDisabled },
    divider: dense.border,
    background: { default: dense.canvas, paper: dense.surface },
    error: { main: dense.error, light: "#FEF3F2" },
    warning: { main: dense.warning, light: "#FFFAEB" },
    success: { main: dense.success, light: "#ECFDF3" },
    action: { hover: alpha(dense.primary, 0.06), selected: dense.selected },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
    htmlFontSize: 16,
    h5: { fontSize: "1rem", fontWeight: 600 },
    h6: { fontSize: "0.9375rem", fontWeight: 600 },
    body1: { fontSize: "0.9375rem", lineHeight: 1.6 },
    body2: { fontSize: "0.875rem", lineHeight: 1.55 },
    caption: { fontSize: "0.75rem", lineHeight: 1.5 },
    button: { fontSize: "0.875rem", fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, size: "small" },
      styleOverrides: {
        root: {
          minHeight: 32,
          borderRadius: 6,
          "&.MuiButton-outlined:hover, &.MuiButton-text:hover": { backgroundColor: alpha(dense.primary, 0.06) },
          "&.MuiButton-contained:hover": { backgroundColor: dense.primaryHover },
        },
      },
    },
    MuiCard: {
      styleOverrides: { root: { border: `1px solid ${dense.border}`, boxShadow: "none", borderRadius: 8 } },
    },
    MuiChip: { styleOverrides: { root: { height: 22, borderRadius: 6, fontSize: "0.75rem" } } },
    MuiTableCell: { styleOverrides: { root: { padding: "6px 12px", borderColor: dense.border } } },
  },
});
