import TopNavigationBar from "@/components/TopNavigationBar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopNavigationBar />
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
