import { createTheme } from "@mui/material/styles";
import { palette } from "./palette";
import { typography } from "./typography";

/** App-wide theme. Pages that are NOT wrapped in <DenseSection> use this. */
export const theme = createTheme({
  palette,
  typography,
  spacing: 8,
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { variant: "outlined" } },
  },
});
