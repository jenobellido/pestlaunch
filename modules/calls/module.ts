import { ListTodo, Phone, SquareKanban } from "lucide-react";
import { defineModule } from "@/core/modules";

export const callsModule = defineModule({
  id: "calls",
  name: "Calls",
  description: "Upload and process call recordings; transcript, call type and outcome.",
  defaultEnabled: true,
  nav: [
    { label: "Calls", href: "/calls", icon: Phone },
    { label: "Leads", href: "/leads", icon: SquareKanban },
    { label: "Follow-ups", href: "/follow-ups", icon: ListTodo },
  ],
});
