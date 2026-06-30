export function scopedConversationId(userId: string, conversationId: string) {
  const trimmed = conversationId.trim();
  const prefix = `${userId}:`;
  return trimmed.startsWith(prefix) ? trimmed : `${prefix}${trimmed}`;
}