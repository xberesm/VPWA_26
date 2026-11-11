import { defineStore, acceptHMRUpdate } from 'pinia';
import { computed, ref } from 'vue';

import type { Channel, Member, Message } from '@/api';
import { useAuthStore } from '@/stores/auth';

import {
  getChannelsBackend,
  createChannelBackend,
  getPublicChannelsBackend,
  joinChannelBackend,
  getChannelMembersBackend,
  openChannelBackend,
  cancelChannelBackend,
  quitChannelBackend,
  inviteUserBackend,
  revokeUserBackend,
  kickUserBackend,
  type BackendChannel,
} from '@/api/channelsApi';

import { getMessagesBackend, sendMessageBackend } from '@/api/messagesApi';

export const useMessagesStore = defineStore('messages', () => {
  const auth = useAuthStore();

  const channels = ref<Channel[]>([]);
  const activeChannelId = ref<number | null>(null);
  const messagesByChannel = ref<Record<number, Message[]>>({});
  const hasMoreByChannel = ref<Record<number, boolean>>({});
  const members = ref<Member[]>([]);
  const currentUserId = ref<number | null>(null);

  // Synchronizacia kazde 3 sekundy
  const POLLING_INTERVAL = 3000;
  let pollingTimer: ReturnType<typeof setInterval> | null = null;
  let pollingRunning = false;

  const activeChannel = computed(() =>
    channels.value.find((channel) => channel.id === activeChannelId.value),
  );

  const activeMessages = computed(() =>
    activeChannelId.value === null ? [] : (messagesByChannel.value[activeChannelId.value] ?? []),
  );

  function requireToken(): string {
    if (!auth.token) {
      throw new Error('Please log in first.');
    }

    return auth.token;
  }

  function mapChannel(channel: BackendChannel, isMember = true): Channel {
    const userId = auth.user?.id;

    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      private: channel.isPrivate,
      invited: channel.invited,
      ownerId: channel.ownerId,
      memberIds: isMember && userId !== undefined ? [userId] : [],
      invitedUserIds: isMember && channel.invited && userId !== undefined ? [userId] : [],
      bannedUserIds: [],
      kickVotes: [],
      createdAt: '',
      lastActivityAt: channel.lastActivityAt ?? '',
    };
  }

  // UC3 - Najnovsich 20 sprav
  async function loadLatestMessages(channelId: number) {
    const page = await getMessagesBackend(requireToken(), channelId);

    messagesByChannel.value[channelId] = page.data;
    hasMoreByChannel.value[channelId] = page.hasMore;
  }

  // UC7 - Starsie spravy
  async function loadOlder(channelId: number): Promise<boolean> {
    const existing = messagesByChannel.value[channelId];

    if (existing === undefined) {
      await loadLatestMessages(channelId);
      return !hasMoreByChannel.value[channelId];
    }

    if (!hasMoreByChannel.value[channelId]) {
      return true;
    }

    const oldestMessage = existing[0];

    if (!oldestMessage) {
      return true;
    }

    const page = await getMessagesBackend(requireToken(), channelId, oldestMessage.id);

    const existingIds = new Set(existing.map((message) => message.id));

    const olderMessages = page.data.filter((message) => !existingIds.has(message.id));

    messagesByChannel.value[channelId] = [...olderMessages, ...existing];

    hasMoreByChannel.value[channelId] = page.hasMore;

    return !page.hasMore;
  }

  // UC3 + UC6 - Posielanie sprav
  async function send(channelId: number, author: string, text: string): Promise<void> {
    void author;

    const trimmedText = text.trim();

    if (!trimmedText) {
      throw new Error('Message cannot be empty.');
    }

    const message = await sendMessageBackend(requireToken(), channelId, trimmedText);

    const existing = messagesByChannel.value[channelId];

    if (existing === undefined) {
      await loadLatestMessages(channelId);
      return;
    }

    if (!existing.some((item) => item.id === message.id)) {
      messagesByChannel.value[channelId] = [...existing, message];
    }
  }

  // UC2 - Nacitanie mojich kanalov
  async function loadChannels(userId: number) {
    const backendChannels = await getChannelsBackend(requireToken());

    if (currentUserId.value !== userId) {
      activeChannelId.value = null;
      messagesByChannel.value = {};
      hasMoreByChannel.value = {};
      members.value = [];
    }

    currentUserId.value = userId;

    channels.value = backendChannels.map((channel) => mapChannel(channel));

    const allowedIds = new Set(channels.value.map((channel) => channel.id));

    for (const key of Object.keys(messagesByChannel.value)) {
      const channelId = Number(key);

      if (!allowedIds.has(channelId)) {
        delete messagesByChannel.value[channelId];
        delete hasMoreByChannel.value[channelId];
      }
    }

    if (!channels.value.some((channel) => channel.id === activeChannelId.value)) {
      activeChannelId.value = channels.value[0]?.id ?? null;
    }

    if (activeChannelId.value !== null) {
      await loadMembers();
      await loadLatestMessages(activeChannelId.value);
    } else {
      members.value = [];
    }

    // Automaticka synchronizacia sa spusti iba raz
    startPolling();
  }

  // UC2 - Clenovia aktivneho kanala
  async function loadMembers() {
    if (activeChannelId.value === null) {
      members.value = [];
      return;
    }

    members.value = await getChannelMembersBackend(requireToken(), activeChannelId.value);
  }

  // UC2 - Otvorenie kanala
  async function selectChannel(channelId: number) {
    if (!channels.value.some((c) => c.id === channelId)) {
      throw new Error('Channel is not in your channel list.');
    }

    await openChannelBackend(requireToken(), channelId);

    activeChannelId.value = channelId;

    if (currentUserId.value !== null) {
      await loadChannels(currentUserId.value);
    }
  }

  // UC2 - Vytvorenie kanala
  async function createChannel(
    name: string,
    description: string,
    isPrivate: boolean,
    ownerId: number,
  ) {
    if (auth.user?.id !== ownerId) {
      throw new Error('Invalid user.');
    }

    const channel = await createChannelBackend(requireToken(), {
      name: name.trim().replace(/^#/, '').toLowerCase(),
      description,
      isPrivate,
    });

    await loadChannels(ownerId);
    await selectChannel(channel.id);

    return mapChannel(channel);
  }

  // UC2 - Verejne kanaly
  async function getPublicChannels(userId: number): Promise<Channel[]> {
    if (auth.user?.id !== userId) {
      throw new Error('Invalid user.');
    }

    const publicChannels = await getPublicChannelsBackend(requireToken());

    return publicChannels.map((channel) => mapChannel(channel, false));
  }

  async function refreshAfterDeparture(channelId: number, userId: number) {
    delete messagesByChannel.value[channelId];
    delete hasMoreByChannel.value[channelId];

    if (activeChannelId.value === channelId) {
      activeChannelId.value = null;
      members.value = [];
    }

    await loadChannels(userId);
  }

  // NOVINKA - automaticke nacitanie zmien
  async function pollChanges() {
    if (
      pollingRunning ||
      currentUserId.value === null ||
      !auth.token ||
      auth.user?.id !== currentUserId.value
    ) {
      return;
    }

    pollingRunning = true;

    const token = auth.token;
    const userId = currentUserId.value;

    try {
      // Nacitame aktualny zoznam kanalov.
      // Takto pribudnu aj nove pozvanky.
      const remoteChannels = await getChannelsBackend(token);

      if (auth.token !== token || currentUserId.value !== userId) {
        return;
      }

      channels.value = remoteChannels.map((channel) => mapChannel(channel));

      const allowedIds = new Set(channels.value.map((channel) => channel.id));

      // Odstranime chaty, z ktorych nas vyhodili
      // alebo ktore prestali existovat.
      for (const key of Object.keys(messagesByChannel.value)) {
        const channelId = Number(key);

        if (!allowedIds.has(channelId)) {
          delete messagesByChannel.value[channelId];
          delete hasMoreByChannel.value[channelId];
        }
      }

      if (activeChannelId.value !== null && !allowedIds.has(activeChannelId.value)) {
        activeChannelId.value = channels.value[0]?.id ?? null;
      }

      const channelId = activeChannelId.value;

      if (channelId === null) {
        members.value = [];
        return;
      }

      // Nacitame clenov aj posledne spravy
      const [remoteMembers, latestPage] = await Promise.all([
        getChannelMembersBackend(token, channelId),
        getMessagesBackend(token, channelId),
      ]);

      if (
        auth.token !== token ||
        currentUserId.value !== userId ||
        activeChannelId.value !== channelId
      ) {
        return;
      }

      members.value = remoteMembers;

      // Zachovame starsie nacitane spravy.
      // Pridame len nove, bez duplicit.
      const previous = messagesByChannel.value[channelId];
      const existing = previous ?? [];

      const byId = new Map<number, Message>();

      for (const message of existing) {
        byId.set(message.id, message);
      }

      for (const message of latestPage.data) {
        byId.set(message.id, message);
      }

      messagesByChannel.value[channelId] = [...byId.values()].sort((a, b) => a.id - b.id);

      if (previous === undefined) {
        hasMoreByChannel.value[channelId] = latestPage.hasMore;
      }
    } catch {
      // Docasny problem so sietou nesmie
      // zablokovat pouzivatelske rozhranie.
      // Dalsia kontrola sa pokusi znovu.
    } finally {
      pollingRunning = false;
    }
  }

  function startPolling() {
    if (pollingTimer !== null) {
      return;
    }

    pollingTimer = setInterval(() => {
      void pollChanges();
    }, POLLING_INTERVAL);
  }

  function stopPolling() {
    if (pollingTimer !== null) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
  }

  // UC4 - IRC prikazy
  async function runCommand(input: string, userId: number): Promise<string> {
    if (auth.user?.id !== userId) {
      throw new Error('Invalid user.');
    }

    const args = input.trim().split(/\s+/);
    const command = args[0]?.toLowerCase();
    const parameter = args[1];

    switch (command) {
      case '/join': {
        if (!parameter || args.length > 3 || (args[2] && args[2].toLowerCase() !== 'private')) {
          throw new Error('Usage: /join channelName [private]');
        }

        const name = parameter.replace(/^#/, '').toLowerCase();

        const result = await joinChannelBackend(requireToken(), {
          name,
          isPrivate: args[2]?.toLowerCase() === 'private',
        });

        await loadChannels(userId);
        await selectChannel(result.data.id);

        return result.message;
      }

      case '/list': {
        if (args.length !== 1) {
          throw new Error('Usage: /list');
        }

        if (activeChannelId.value === null) {
          throw new Error('Select a channel first.');
        }

        await loadMembers();

        return `Members: ${members.value
          .map((member) => member.username + (member.isOwner ? ' (owner)' : ''))
          .join(', ')}`;
      }

      case '/cancel': {
        if (args.length !== 1 || activeChannelId.value === null) {
          throw new Error('Select a channel first. Usage: /cancel');
        }

        const channelId = activeChannelId.value;

        const result = await cancelChannelBackend(requireToken(), channelId);

        await refreshAfterDeparture(channelId, userId);

        return result.message;
      }

      case '/quit': {
        if (args.length !== 1 || activeChannelId.value === null) {
          throw new Error('Select a channel first. Usage: /quit');
        }

        const channelId = activeChannelId.value;

        const result = await quitChannelBackend(requireToken(), channelId);

        await refreshAfterDeparture(channelId, userId);

        return result.message;
      }

      case '/invite':
      case '/revoke':
      case '/kick': {
        if (!parameter || args.length !== 2) {
          throw new Error(`Usage: ${command} nickname`);
        }

        if (activeChannelId.value === null) {
          throw new Error('Select a channel first.');
        }

        const nickname = parameter.replace(/^@/, '').toLowerCase();

        if (!/^[a-z0-9_]{3,50}$/.test(nickname)) {
          throw new Error('Invalid nickname.');
        }

        const token = requireToken();
        const channelId = activeChannelId.value;

        let result;

        if (command === '/invite') {
          result = await inviteUserBackend(token, channelId, nickname);
        } else if (command === '/revoke') {
          result = await revokeUserBackend(token, channelId, nickname);
        } else {
          result = await kickUserBackend(token, channelId, nickname);
        }

        await loadMembers();

        return result.message;
      }

      case '/help':
        return (
          'Available commands: ' +
          '/join name [private], /list, ' +
          '/invite nickname, /revoke nickname, ' +
          '/kick nickname, /cancel, /quit, /help.'
        );

      default:
        throw new Error(`Unknown command ${command}. Type /help.`);
    }
  }

  // Vycistenie po odhlaseni
  function reset() {
    stopPolling();

    currentUserId.value = null;
    activeChannelId.value = null;
    channels.value = [];
    members.value = [];
    messagesByChannel.value = {};
    hasMoreByChannel.value = {};
  }

  return {
    channels,
    activeChannelId,
    activeChannel,
    activeMessages,
    members,
    loadChannels,
    loadMembers,
    selectChannel,
    loadOlder,
    send,
    createChannel,
    runCommand,
    getPublicChannels,
    reset,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMessagesStore, import.meta.hot));
}
