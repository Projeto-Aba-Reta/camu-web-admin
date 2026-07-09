import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-charcoal/10 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-charcoal">Entrar no Camu Admin</h1>
        <LoginForm />
      </div>
    </main>
  );
}
