import { getRequestMessages } from "@/lib/i18n/server";
import { translate } from "@idx/i18n";

export default async function AdminLoading() {
  const { messages } = await getRequestMessages();

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      {translate(messages, "common.loading")}
    </div>
  );
}