"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SOCIAL_STATUS_LABEL } from "@/components/marketing/labels";
import { advancePlanItemStatusAction } from "@/app/(dashboard)/marketing/calendario/actions";
import { SOCIAL_CONTENT_STATUS_SEQUENCE, type SocialContentStatus } from "@/types/marketing";

interface AdvanceStatusButtonProps {
  itemId: string;
  currentStatus: SocialContentStatus;
}

export function AdvanceStatusButton({ itemId, currentStatus }: AdvanceStatusButtonProps) {
  const [isAdvancing, setIsAdvancing] = useState(false);
  const router = useRouter();

  const nextStatus = SOCIAL_CONTENT_STATUS_SEQUENCE[SOCIAL_CONTENT_STATUS_SEQUENCE.indexOf(currentStatus) + 1];
  if (!nextStatus) return null;

  async function handleAdvance() {
    setIsAdvancing(true);
    const result = await advancePlanItemStatusAction(itemId);
    setIsAdvancing(false);

    if (!result.ok) {
      toast.error(result.error ?? "Não foi possível avançar o status do item.");
      return;
    }

    toast.success(`Item movido para ${SOCIAL_STATUS_LABEL[nextStatus]}.`);
    router.refresh();
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleAdvance} disabled={isAdvancing}>
      <ArrowRight className="size-4" />
      {SOCIAL_STATUS_LABEL[nextStatus]}
    </Button>
  );
}
