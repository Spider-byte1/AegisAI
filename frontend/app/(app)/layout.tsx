import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </AuthGuard>
  );
}
