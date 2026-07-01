"use client";

import { loadFormList } from "@/lib/voice-form/api";
import { useVoiceFormSession } from "@/lib/voice-form/session-context";
import { useEffect, useRef } from "react";

/** Bootstraps forms catalog + voice-form sessions (single list fetch on auth). */
export function VoiceFormSessionInit({
  onReady,
  onError,
}: {
  onReady: (forms: Awaited<ReturnType<typeof loadFormList>>) => void;
  onError: (err: unknown) => void;
}) {
  const { initialAuth, bootstrapSessions, setGuestGatewayId } = useVoiceFormSession();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      try {
        const forms = await loadFormList("");
        onReady(forms);
        if (!initialAuth) {
          setGuestGatewayId(crypto.randomUUID());
          return;
        }
        await bootstrapSessions();
      } catch (err) {
        onError(err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAuth]);

  return null;
}