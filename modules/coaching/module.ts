import { UsersRound } from "lucide-react";
import { defineModule } from "@/core/modules";

export const coachingModule = defineModule({
  id: "coaching",
  name: "Coaching",
  description: "Feedback on every call, and how each rep is doing over time.",
  defaultEnabled: true,
  dependsOn: ["calls"],
  nav: [{ label: "Team", href: "/team", icon: UsersRound }],
});
