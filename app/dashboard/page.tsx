import type { Metadata } from "next";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { getDashboardData } from "@/lib/dashboard/data";

export const metadata: Metadata = {
  title: "Dashboard — Quovi",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const data = await getDashboardData();

  return <DashboardHome data={data} welcome={welcome === "1"} />;
}
