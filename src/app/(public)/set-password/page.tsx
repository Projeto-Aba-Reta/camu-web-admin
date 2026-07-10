import type { Metadata } from "next";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export const metadata: Metadata = {
  title: "Definir senha",
};

export default function SetPasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-charcoal/10 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-charcoal">Bem-vindo(a) ao Camu Admin</h1>
        <p className="mb-6 text-sm text-charcoal/70">
          Defina uma senha para concluir seu cadastro e acessar o painel.
        </p>
        <SetPasswordForm />
      </div>
    </main>
  );
}
