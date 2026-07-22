import TopNavigationBar from "@/components/TopNavigationBar";
import TemplateSidebar from "@/components/TemplateSidebar";

export default async function TemplateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="min-h-screen">
      <TopNavigationBar />
      <div className="mx-auto flex max-w-7xl gap-10 px-6 py-10">
        <TemplateSidebar templateId={id} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
