import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { AppButton } from "./app-button";

/** Generic "nothing here yet" block used across the product. */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center", py: 6 }}>
      {icon ? <Box sx={{ color: "text.disabled", fontSize: 40, display: "flex" }}>{icon}</Box> : null}
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <AppButton size="small" variant="outlined" onClick={onAction}>
          {actionLabel}
        </AppButton>
      ) : null}
    </Stack>
  );
}
