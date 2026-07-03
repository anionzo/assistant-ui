import type { Metadata } from "next";
import { HomePage } from "@/components/public/home-page";
import { resolvePublicLegal } from "@/lib/server/resolve-public-legal";

export const metadata: Metadata = {
  title: "Idx Chat",
  description: "Nền tảng trợ lý AI — trò chuyện, nhập liệu và các tính năng tương tác tùy cấu hình triển khai.",
  openGraph: {
    type: "website",
    title: "Idx Chat",
    description: "Nền tảng trợ lý AI cho nhiều kịch bản triển khai.",
  },
};

export default async function Page() {
  const legal = await resolvePublicLegal();
  return <HomePage home={legal.home} display={legal.display} />;
}