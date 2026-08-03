import type { Metadata } from "next";
import { HomePage } from "@/components/public/home-page";
import { resolvePublicLegal } from "@/lib/server/resolve-public-legal";

export const metadata: Metadata = {
  title: "Trợ lý Giảng viên",
  description: "Cổng trợ lý AI dành cho giảng viên — soạn bài, tra cứu quy chế và hỗ trợ giảng dạy.",
  openGraph: {
    type: "website",
    title: "Trợ lý Giảng viên",
    description: "Cổng trợ lý AI dành cho giảng viên.",
  },
};

export default async function Page() {
  const legal = await resolvePublicLegal();
  return <HomePage home={legal.home} display={legal.display} />;
}