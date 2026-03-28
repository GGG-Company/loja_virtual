export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
  aiPowered?: boolean;
}

export interface AssistantResponse {
  answer: string;
  type: string;
  data: any;
  secure?: boolean;
  context?: string;
  timestamp?: string;
  aiPowered?: boolean;
  model?: string;
}

export type AssistantMode = 'smart' | 'ai';
