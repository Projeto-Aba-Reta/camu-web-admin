import { getCurrentProfile } from "@/lib/auth/get-current-profile";

export default async function DashboardHomePage() {
  const currentUser = await getCurrentProfile();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-charcoal">
        Olá, {currentUser?.fullName ?? currentUser?.email}
      </h1>
      <p className="mt-2 text-charcoal/70">
        Este é o painel administrativo da Camu. As áreas de negócio serão
        adicionadas nas próximas fases.
      </p>
    </div>
  );
}
