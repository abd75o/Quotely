import { ProfilForm } from "@/components/dashboard/ProfilForm";

export const metadata = {
  title: "Mon profil — Quovi",
  robots: { index: false, follow: false },
};

export default function ProfilPage() {
  return <ProfilForm />;
}
