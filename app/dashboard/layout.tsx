import type { ReactNode } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { ChatBotWrapper } from "@/components/ai/ChatBotWrapper";

export const metadata = {
  title: "Dashboard — Quotely",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface)] flex flex-col lg:flex-row">
      <DashboardSidebar />
      <main className="flex-1 min-w-0 flex flex-col w-full">
        <div className="flex-1 px-4 lg:px-8 py-5 lg:py-8">
          <TrialBanner />
          {children}
        </div>
      </main>
      <ChatBotWrapper />
    </div>
  );
}
