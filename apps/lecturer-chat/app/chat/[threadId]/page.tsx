type Params = {
  params: Promise<{ threadId: string }>;
};

export default async function ThreadChatPage({ params }: Params) {
  await params;
  return null;
}