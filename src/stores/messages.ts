import { defineStore, acceptHMRUpdate } from 'pinia';
import { computed, ref } from 'vue';
import * as api from '@/api';
import type { Channel, Message } from '@/api';

const PAGE_SIZE = 20;

export const useMessagesStore = defineStore('messages', () => {
  const channels = ref<Channel[]>([]);
  const activeChannelId = ref<number | null>(null);
  const messagesByChannel = ref<Record<number, Message[]>>({});

  const activeChannel = computed(() => channels.value.find((c) => c.id === activeChannelId.value));
  const activeMessages = computed(() =>
    activeChannelId.value === null ? [] : (messagesByChannel.value[activeChannelId.value] ?? []),
  );

  async function loadChannels() {
    channels.value = await api.getChannels();
    activeChannelId.value ??= channels.value[0]?.id ?? null;
  }

  // Prepends the next page of older messages. Returns true when there is nothing left to load.
  async function loadOlder(channelId: number) {
    const current = messagesByChannel.value[channelId] ?? [];
    const older = await api.getMessages(channelId, current[0]?.id, PAGE_SIZE);
    messagesByChannel.value[channelId] = [...older, ...(messagesByChannel.value[channelId] ?? [])];
    return older.length < PAGE_SIZE;
  }

  async function send(channelId: number, author: string, text: string) {
    const message = await api.sendMessage(channelId, author, text);
    (messagesByChannel.value[channelId] ??= []).push(message);
  }

  return {
    channels,
    activeChannelId,
    activeChannel,
    activeMessages,
    loadChannels,
    loadOlder,
    send,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useMessagesStore, import.meta.hot));
}
