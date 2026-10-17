import { MessageSquareText } from "lucide-react";
import { defineModule } from "@/core/modules";

export const coachingModule = defineModule({
  id: "coaching",
  name: "Coaching",
  description: "Actionable feedback per call and trends per employee.",
  defaultEnabled: true,
  dependsOn: ["calls"],
  nav: [{ label: "Coaching", href: "/coaching", icon: MessageSquareText }],
});
