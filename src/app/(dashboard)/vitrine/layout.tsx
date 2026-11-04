import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { canEditStorefront } from "@/lib/auth/store-access";

export default async function VitrineLayout({ children }: { children: React.ReactNode }) {
  const currentUser = await getCurrentProfile();
  if (!currentUser || !canEditStorefront(currentUser)) {
    redirect("/");
  }
  return <>{children}</>;
}
