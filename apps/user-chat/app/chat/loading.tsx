import { LoadingCenter } from "@/components/ui/loading-spinner";

export default function ChatLoading() {
  return (
    <div className="bg-background flex h-dvh w-full items-center justify-center">
      <LoadingCenter label="Đang mở trò chuyện..." />
    </div>
  );
}