export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ sessionId: string }>;
};

export default async function VoiceFormSessionPage({ params }: Params) {
  await params;
  return null;
}