"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/(public)/login/actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-charcoal">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-charcoal/20 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-teal"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-charcoal">
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-charcoal/20 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-teal"
        />
      </div>

      {state.error ? <p className="text-sm text-coral">{state.error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-dark disabled:opacity-60"
      >
        {isPending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
