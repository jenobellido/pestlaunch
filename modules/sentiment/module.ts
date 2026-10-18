import { defineModule } from "@/core/modules";

export const sentimentModule = defineModule({
  id: "sentiment",
  name: "Sentiment",
  description: "How the customer felt through each call: where it turned, and how it ended.",
  defaultEnabled: true,
  dependsOn: ["calls"],
});
