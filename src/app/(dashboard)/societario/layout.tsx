import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-current-profile";
import { PageHeader } from "@/components/layout/page-header";
import { SocietarioTabs } from "@/components/societario/societario-tabs";

export default async function SocietarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentProfile();

  // Acesso condicionado a user_type (owner/socio), nunca à role `societario`
  // — a role só decide exibição na sidebar (ver design.md desta change). Um
  // member com a role atribuída por engano continua sem acesso ao dado.
  if (!currentUser || (currentUser.userType !== "owner" && currentUser.userType !== "socio")) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Societário"
        description="Acordo de sociedade, enquadramento jurídico, faturamento x teto do MEI e log de decisões."
      />
      <SocietarioTabs />
      {children}
    </div>
  );
}
