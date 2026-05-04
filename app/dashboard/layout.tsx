import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { ChatBotWrapper } from "@/components/ai/ChatBotWrapper";
import { UpgradeModalProvider } from "@/lib/hooks/useUpgradeModal";

export const metadata = {
  title: "Dashboard — Quovi",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <UpgradeModalProvider>
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
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={3000}
        toastOptions={{
          className: "sm:!translate-x-0",
        }}
        className="sm:!right-4 sm:!left-auto sm:!top-4"
      />
    </UpgradeModalProvider>
  );
}
