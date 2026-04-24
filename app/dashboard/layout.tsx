import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export const metadata = {
  title: "Dashboard — Quotely",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface)] flex">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 px-4 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
