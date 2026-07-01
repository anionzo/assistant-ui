import { VoiceFormShell } from "@/components/voice-form/voice-form-shell";
import { checkSession } from "@/lib/auth/session-resolve";

export const dynamic = "force-dynamic";

export default async function VoiceFormLayout({ children }: { children: React.ReactNode }) {
  const session = await checkSession();
  return (
    <VoiceFormShell initialAuth={!!session}>
      {children}
    </VoiceFormShell>
  );
}