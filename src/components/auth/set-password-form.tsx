"use client";

import { useActionState } from "react";
import { setPassword, type SetPasswordState } from "@/app/(public)/set-password/actions";

const initialState: SetPasswordState = { error: null };

export function SetPasswordForm() {
  const [state, formAction, isPending] = useActionState(setPassword, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-charcoal">
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-charcoal/20 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-teal"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="confirmPassword" className="text-sm font-medium text-charcoal">
          Confirmar senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="rounded-md border border-charcoal/20 bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-teal"
        />
      </div>

      {state.error ? <p className="text-sm text-coral">{state.error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-dark disabled:opacity-60"
      >
        {isPending ? "Salvando…" : "Definir senha e entrar"}
      </button>
    </form>
  );
}
