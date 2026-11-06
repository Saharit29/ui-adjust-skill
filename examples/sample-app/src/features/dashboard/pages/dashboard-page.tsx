import { Container, Typography } from "@mui/material";
import { DashboardPanels } from "../components/dashboard-panels";

export default function DashboardPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" sx={{ mb: 3 }}>
        Good morning
      </Typography>
      <DashboardPanels />
    </Container>
  );
}
