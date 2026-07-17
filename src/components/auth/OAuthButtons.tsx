"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export function OAuthButtons() {
  return (
    <div className="grid gap-3">
      <Button
        type="button"
        variant="outline"
        fullWidth
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      >
        Continuar com Google
      </Button>
      <Button
        type="button"
        variant="outline"
        fullWidth
        onClick={() => signIn("facebook", { callbackUrl: "/dashboard" })}
      >
        Continuar com Facebook
      </Button>
    </div>
  );
}
