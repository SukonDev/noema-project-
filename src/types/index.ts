export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  isActive?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
