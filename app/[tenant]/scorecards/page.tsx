import { ScorecardsPage } from "@/modules/scorecards";
import { requireModule } from "../_lib/require-module";

export default async function Page({ params }: PageProps<"/[tenant]/scorecards">) {
  await requireModule(params, "scorecards");
  return <ScorecardsPage />;
}
