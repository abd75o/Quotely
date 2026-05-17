"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

interface ProfileButtonProps {
  label: string;
}

export function ProfileButton({ label }: ProfileButtonProps) {
  return (
    <Link
      href="/dashboard/parametres"
      className="mt-2 inline-flex items-center gap-1.5 self-start rounded-lg border border-[var(--primary)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white"
    >
      <Settings className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
