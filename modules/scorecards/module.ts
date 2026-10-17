import { ClipboardCheck } from "lucide-react";
import { defineModule } from "@/core/modules";

export const scorecardsModule = defineModule({
  id: "scorecards",
  name: "Scorecards",
  description: "Grades calls against the PestLaunch call process scorecards.",
  defaultEnabled: true,
  dependsOn: ["calls"],
  nav: [{ label: "Scorecards", href: "/scorecards", icon: ClipboardCheck }],
});
