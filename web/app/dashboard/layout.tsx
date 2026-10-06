import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Navbar />
      <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
    </ProtectedRoute>
  );
}
