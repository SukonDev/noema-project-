export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  isActive?: boolean;
}

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  base64Data?: string;
  textContent?: string;
}

export interface GeneratedFile {
  name: string;
  content: string;
  mimeType: string;
}

export interface WebSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  faviconUrl: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  files?: GeneratedFile[];
  sources?: WebSource[];
}
