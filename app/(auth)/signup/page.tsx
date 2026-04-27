import { redirect } from "next/navigation";

// Signup and login share the same flow via Supabase OAuth / magic link
export default function SignupPage() {
  redirect("/login");
}
