import type { Message } from '@/api';

// Sprava z AdonisJS vratane oznacenych pouzivatelov
export interface BackendMessage extends Message {
  mentionedUserIds: number[];
}

export interface MessagesPage {
  data: BackendMessage[];
  hasMore: boolean;
}

const API_URL = 'http://localhost:3333/api/v1';

// Spolocna funkcia pre HTTP komunikaciu
async function messageRequest<T>(
  path: string,
  token: string,
  method: 'GET' | 'POST',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = result as {
      message?: string;
      errors?: { message: string }[];
    } | null;

    throw new Error(
      error?.errors?.[0]?.message ?? error?.message ?? `API error: ${response.status}`,
    );
  }

  return result as T;
}

// UC3 + UC7 - Nacitanie historie sprav
export async function getMessagesBackend(
  token: string,
  channelId: number,
  beforeId?: number,
  limit = 20,
): Promise<MessagesPage> {
  const query = new URLSearchParams({
    limit: String(limit),
  });

  if (beforeId !== undefined) {
    query.set('beforeId', String(beforeId));
  }

  return messageRequest<MessagesPage>(
    `/channels/${channelId}/messages?${query.toString()}`,
    token,
    'GET',
  );
}

// UC3 + UC6 - Odoslanie spravy
export async function sendMessageBackend(
  token: string,
  channelId: number,
  text: string,
): Promise<BackendMessage> {
  const result = await messageRequest<{
    data: BackendMessage;
  }>(`/channels/${channelId}/messages`, token, 'POST', { text });

  return result.data;
}
