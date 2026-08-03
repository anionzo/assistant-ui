import { VoiceFormShell } from "@/components/voice-form/voice-form-shell";
import { checkSession } from "@/lib/auth/session-resolve";
import { VOICE_FORM_PAGE_ENABLED } from "@/lib/feature-flags";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VoiceFormLayout() {
  if (!VOICE_FORM_PAGE_ENABLED) {
    redirect("/chat");
  }
  const session = await checkSession();
  return <VoiceFormShell initialAuth={!!session} />;
}