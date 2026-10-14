
import {
  defineStore,
  acceptHMRUpdate,
} from 'pinia';

import {
  computed,
  ref,
} from 'vue';

import * as api from '@/api';

import type {
  Channel,
  Member,
  Message,
} from '@/api';

const PAGE_SIZE = 20;

export const useMessagesStore = defineStore(
  'messages',
  () => {
    const channels = ref<Channel[]>([]);

    const activeChannelId =
      ref<number | null>(null);

    const messagesByChannel =
      ref<Record<number, Message[]>>({});

    const members = ref<Member[]>([]);

    const currentUserId =
      ref<number | null>(null);

    const activeChannel = computed(() =>
      channels.value.find(
        (c) => c.id === activeChannelId.value,
      ),
    );

    const activeMessages = computed(() =>
      activeChannelId.value === null
        ? []
        : messagesByChannel.value[
        activeChannelId.value
        ] ?? [],
    );

    async function loadChannels(userId: number) {
      if (currentUserId.value !== userId) {
        currentUserId.value = userId;
        activeChannelId.value = null;
        messagesByChannel.value = {};
        members.value = [];
      }

      channels.value =
        await api.getChannels(userId);

      if (
        !channels.value.some(
          (c) => c.id === activeChannelId.value,
        )
      ) {
        activeChannelId.value =
          channels.value[0]?.id ?? null;
      }

      await loadMembers();
    }

    async function loadMembers() {
      if (
        activeChannelId.value === null ||
        currentUserId.value === null
      ) {
        members.value = [];
        return;
      }

      members.value =
        await api.getChannelMembers(
          activeChannelId.value,
          currentUserId.value,
        );
    }

    async function selectChannel(
      channelId: number,
    ) {
      if (currentUserId.value === null) return;

      await api.openChannel(
        channelId,
        currentUserId.value,
      );

      activeChannelId.value = channelId;

      await loadChannels(currentUserId.value);
    }

    // Load older messages using infinite scroll.
    async function loadOlder(channelId: number) {
      const current =
        messagesByChannel.value[channelId] ?? [];

      const older = await api.getMessages(
        channelId,
        current[0]?.id,
        PAGE_SIZE,
      );

      messagesByChannel.value[channelId] = [
        ...older,
        ...(messagesByChannel.value[channelId] ?? []),
      ];

      return older.length < PAGE_SIZE;
    }

    async function send(
      channelId: number,
      author: string,
      text: string,
    ) {
      const message = await api.sendMessage(
        channelId,
        author,
        text,
      );

      (
        messagesByChannel.value[channelId] ??= []
      ).push(message);
    }

    async function createChannel(
      name: string,
      description: string,
      isPrivate: boolean,
      ownerId: number,
    ) {
      const channel = await api.createChannel(
        name,
        description,
        isPrivate,
        ownerId,
      );

      await loadChannels(ownerId);
      await selectChannel(channel.id);

      return channel;
    }

    // Slash commands.
    async function runCommand(
      input: string,
      userId: number,
    ): Promise<string> {
      const args = input.trim().split(/\s+/);

      const command = args[0]?.toLowerCase();
      const parameter = args[1];

      const channelId = activeChannelId.value;

      const needsChannel = () => {
        if (channelId === null) {
          throw new Error(
            'Select or join a channel first.',
          );
        }

        return channelId;
      };

      let response: string;
      let shouldSelectNewChannel = false;

      switch (command) {
        case '/join': {
          if (
            !parameter ||
            args.length > 3 ||
            (
              args[2] &&
              args[2].toLowerCase() !== 'private'
            )
          ) {
            throw new Error(
              'Usage: /join channelName [private]',
            );
          }

          response = (
            await api.joinChannel(
              parameter,
              userId,
              args[2]?.toLowerCase() === 'private',
            )
          ).message;

          shouldSelectNewChannel = true;

          break;
        }

        case '/invite':
          if (!parameter || args.length !== 2) {
            throw new Error(
              'Usage: /invite nickName',
            );
          }

          response = (
            await api.inviteUser(
              needsChannel(),
              userId,
              parameter,
            )
          ).message;

          break;

        case '/revoke':
          if (!parameter || args.length !== 2) {
            throw new Error(
              'Usage: /revoke nickName',
            );
          }

          response = (
            await api.revokeUser(
              needsChannel(),
              userId,
              parameter,
            )
          ).message;

          break;

        case '/kick':
          if (!parameter || args.length !== 2) {
            throw new Error(
              'Usage: /kick nickName',
            );
          }

          response = (
            await api.kickUser(
              needsChannel(),
              userId,
              parameter,
            )
          ).message;

          break;

        case '/cancel':
          if (args.length !== 1) {
            throw new Error('Usage: /cancel');
          }

          response = (
            await api.leaveChannel(
              needsChannel(),
              userId,
            )
          ).message;

          break;

        case '/quit':
          if (args.length !== 1) {
            throw new Error('Usage: /quit');
          }

          response = (
            await api.closeChannel(
              needsChannel(),
              userId,
            )
          ).message;

          break;

        case '/list':
          if (args.length !== 1) {
            throw new Error('Usage: /list');
          }

          await loadMembers();

          response = `Members: ${members.value
            .map(
              (member) =>
                member.username +
                (member.isOwner ? ' (owner)' : ''),
            )
            .join(', ')}`;

          break;

        case '/help':
          response =
            'Commands: /join name [private], /invite nick, /revoke nick, /kick nick, /cancel, /quit, /list';

          break;

        default:
          throw new Error(
            `Unknown command ${command}. Type /help for a list of commands.`,
          );
      }

      await loadChannels(userId);

      if (
        shouldSelectNewChannel &&
        parameter
      ) {
        const newChannel = channels.value.find(
          (c) =>
            c.name.toLowerCase() ===
            parameter.replace(/^#/, '').toLowerCase(),
        );

        if (newChannel) {
          await selectChannel(newChannel.id);
        }
      }

      return response;
    }

    async function getPublicChannels(
      userId: number,
    ) {
      return api.getPublicChannels(userId);
    }

    function reset() {
      currentUserId.value = null;
      activeChannelId.value = null;
      channels.value = [];
      members.value = [];
      messagesByChannel.value = {};
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
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(
      useMessagesStore,
      import.meta.hot,
    ),
  );
}
