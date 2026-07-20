import TemplateAdmin from "@/components/TemplateAdmin";

export default async function TemplateAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TemplateAdmin templateId={id} />;
}
