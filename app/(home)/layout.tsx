import HomeSidebar from "@/components/HomeSidebar";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-10 px-6 py-10">
      <HomeSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
