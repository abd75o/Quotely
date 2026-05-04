import { EntrepriseForm } from "@/components/dashboard/EntrepriseForm";

export const metadata = {
  title: "Mon entreprise — Quovi",
  robots: { index: false, follow: false },
};

export default function EntreprisePage() {
  return <EntrepriseForm />;
}
