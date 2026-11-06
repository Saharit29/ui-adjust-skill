import type { SvgIconComponent } from "@mui/icons-material";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import { Box, Card, CardContent, Divider, Stack, Typography } from "@mui/material";

interface EmptyStateProps {
  icon: SvgIconComponent;
  title: string;
  subtitle: string;
}

function EmptyState({ icon: Icon, title, subtitle }: EmptyStateProps) {
  return (
    <Box sx={{ py: 6, px: 3, textAlign: "center" }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "action.hover",
          color: "text.disabled",
          mx: "auto",
          mb: 1.5,
        }}
      >
        <Icon sx={{ fontSize: 26 }} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
        {subtitle}
      </Typography>
    </Box>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <Stack direction="row" sx={{ px: 2.5, py: 2, alignItems: "center" }}>
        <Typography variant="h6">{title}</Typography>
      </Stack>
      <Divider />
      <CardContent sx={{ p: 0 }}>{children}</CardContent>
    </Card>
  );
}

export function DashboardPanels() {
  return (
    <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
      <Panel title="Insights">
        <EmptyState
          icon={InsightsRoundedIcon}
          title="No insights yet"
          subtitle="Charts appear once your first data source is connected."
        />
      </Panel>
      <Panel title="Waiting on you">
        <EmptyState
          icon={PendingActionsRoundedIcon}
          title="Nothing is waiting"
          subtitle="Approvals and requests that need you will show up here."
        />
      </Panel>
      <Panel title="Announcements">
        <EmptyState
          icon={CampaignRoundedIcon}
          title="No announcements"
          subtitle="Company news and events will be listed here."
        />
      </Panel>
    </Box>
  );
}
