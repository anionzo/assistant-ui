import { LoadingCenter } from "@/components/ui/loading-spinner";
import { getRequestMessages } from "@/lib/i18n/server";
import { translate } from "@idx/i18n";

export default async function ChatLoading() {
  const { messages } = await getRequestMessages();

  return (
    <div className="bg-background flex h-dvh w-full items-center justify-center">
      <LoadingCenter label={translate(messages, "loading.openingChat")} />
    </div>
  );
}