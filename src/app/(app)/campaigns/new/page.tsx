import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { CampaignForm } from "./campaign-form";

export default async function NewCampaignPage({ searchParams }: PageProps<"/campaigns/new">) {
  const { id } = await requireRole("brand");
  const first = (await searchParams).first === "1";
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Post a campaign"
        subtitle={first ? "Tell creators what you need. You can skip this and browse creators first." : "Tell creators what you need."}
        back={first ? undefined : "/campaigns/mine"}
      />
      <CampaignForm brandId={id} first={first} />
    </div>
  );
}
