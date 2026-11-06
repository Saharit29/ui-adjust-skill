import Button, { type ButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { forwardRef } from "react";

export type AppButtonProps = Omit<ButtonProps, "color"> & {
  color?: "primary" | "error" | "neutral";
  loading?: boolean;
};

/** The only button in the product. Heights are part of the design system: small 36 · medium 40 · large 44. */
export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  { color = "primary", loading = false, disabled, children, size = "medium", sx, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      color={color === "neutral" ? "inherit" : color}
      size={size}
      disabled={disabled || loading}
      sx={[
        {
          minHeight: size === "small" ? 36 : size === "large" ? 44 : 40,
          borderRadius: 1,
          fontWeight: 600,
          px: size === "small" ? 1.5 : 2,
          ...(color === "neutral" && { color: "text.secondary" }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...props}
    >
      {loading ? <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} /> : null}
      {children}
    </Button>
  );
});
