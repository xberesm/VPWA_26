const API_URL = 'http://localhost:3333/api/v1';

export interface BackendChannel {
  id: number;
  name: string;
  description: string;
  isPrivate: boolean;
  ownerId: number;
  invited: boolean;
  lastActivityAt?: string | null;
}

export interface BackendMember {
  id: number;
  username: string;
  isOwner: boolean;
}

export interface CreateChannelData {
  name: string;
  description: string;
  isPrivate: boolean;
}

export interface JoinChannelData {
  name: string;
  isPrivate: boolean;
}

export interface JoinChannelResult {
  message: string;
  data: BackendChannel;
}

export interface ChannelDepartureResult {
  message: string;
  deleted: boolean;
}

// Odpoved pri /invite, /revoke a /kick
export interface ChannelModerationResult {
  message: string;
  banned?: boolean;
  votes?: number;
}

// Spolocna funkcia pre API komunikaciu
async function channelRequest<T>(
  path: string,
  token: string,
  method: 'GET' | 'POST' | 'DELETE',
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

// UC2 - Moje kanaly
export async function getChannelsBackend(token: string): Promise<BackendChannel[]> {
  const result = await channelRequest<{
    data: BackendChannel[];
  }>('/channels', token, 'GET');

  return result.data;
}

// UC2 - Vytvorenie kanala
export async function createChannelBackend(
  token: string,
  data: CreateChannelData,
): Promise<BackendChannel> {
  const result = await channelRequest<{
    data: BackendChannel;
  }>('/channels', token, 'POST', data);

  return result.data;
}

// UC2 - Verejne kanaly
export async function getPublicChannelsBackend(token: string): Promise<BackendChannel[]> {
  const result = await channelRequest<{
    data: BackendChannel[];
  }>('/channels/public', token, 'GET');

  return result.data;
}

// UC4 - /join
export async function joinChannelBackend(
  token: string,
  data: JoinChannelData,
): Promise<JoinChannelResult> {
  return channelRequest<JoinChannelResult>('/channels/join', token, 'POST', data);
}

// UC10 - Zoznam clenov
export async function getChannelMembersBackend(
  token: string,
  channelId: number,
): Promise<BackendMember[]> {
  const result = await channelRequest<{
    data: BackendMember[];
  }>(`/channels/${channelId}/members`, token, 'GET');

  return result.data;
}

// UC2 - Otvorenie pozvaneho kanala
export async function openChannelBackend(token: string, channelId: number): Promise<void> {
  await channelRequest<{ message: string }>(`/channels/${channelId}/open`, token, 'POST');
}

// UC5 - /cancel
export async function cancelChannelBackend(
  token: string,
  channelId: number,
): Promise<ChannelDepartureResult> {
  return channelRequest<ChannelDepartureResult>(
    `/channels/${channelId}/membership`,
    token,
    'DELETE',
  );
}

// UC4 - /quit
export async function quitChannelBackend(
  token: string,
  channelId: number,
): Promise<ChannelDepartureResult> {
  return channelRequest<ChannelDepartureResult>(`/channels/${channelId}`, token, 'DELETE');
}

// UC4 - /invite nickname
export async function inviteUserBackend(
  token: string,
  channelId: number,
  nickname: string,
): Promise<ChannelModerationResult> {
  return channelRequest<ChannelModerationResult>(`/channels/${channelId}/invite`, token, 'POST', {
    nickname,
  });
}

// UC4 - /revoke nickname
export async function revokeUserBackend(
  token: string,
  channelId: number,
  nickname: string,
): Promise<ChannelModerationResult> {
  return channelRequest<ChannelModerationResult>(`/channels/${channelId}/revoke`, token, 'POST', {
    nickname,
  });
}

// UC4 - /kick nickname
export async function kickUserBackend(
  token: string,
  channelId: number,
  nickname: string,
): Promise<ChannelModerationResult> {
  return channelRequest<ChannelModerationResult>(`/channels/${channelId}/kick`, token, 'POST', {
    nickname,
  });
}
