import { ClipboardCheck } from "lucide-react";
import { defineModule } from "@/core/modules";

export const scorecardsModule = defineModule({
  id: "scorecards",
  name: "Scorecards",
  description: "Grades calls against the PestLaunch call process scorecards.",
  defaultEnabled: true,
  dependsOn: ["calls"],
  // The rubric is reference material, linked from each call's score rather than the sidebar.
  nav: [{ label: "Scorecards", href: "/scorecards", icon: ClipboardCheck, inSidebar: false }],
});
