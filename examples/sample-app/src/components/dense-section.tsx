import { Box, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { denseTheme } from "@/theme/dense-theme";

/** Wraps a data-heavy screen in the compact theme. */
export function DenseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ThemeProvider theme={denseTheme}>
      <Box component="section" sx={{ bgcolor: "background.default", p: 3 }}>
        <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
          {title}
        </Typography>
        {children}
      </Box>
    </ThemeProvider>
  );
}
