
import { defineStore, acceptHMRUpdate } from 'pinia';
import { computed, ref } from 'vue';
import { useMessagesStore } from '@/stores/messages';

export type UserStatus = 'online' | 'dnd' | 'offline';

type IncomingMessage = {
  channelId: number;
  sender: string;
  text: string;
};

type NotificationEntry = IncomingMessage & {
  id: number;
  channelName: string;
  createdAt: string;
};

type StoredSettings = {
  status: UserStatus;
  onlyMentions: boolean;
};

const storageKey = (userId: number) =>
  `vpwa-presence-${userId}`;

const isStatus = (value: unknown): value is UserStatus =>
  value === 'online' ||
  value === 'dnd' ||
  value === 'offline';

function readSettings(userId: number): StoredSettings {
  try {
    const raw = localStorage.getItem(
      storageKey(userId),
    );

    if (raw) {
      const parsed: unknown = JSON.parse(raw);

      if (
        parsed &&
        typeof parsed === 'object' &&
        'status' in parsed &&
        'onlyMentions' in parsed
      ) {
        const value = parsed as Partial<StoredSettings>;

        if (
          isStatus(value.status) &&
          typeof value.onlyMentions === 'boolean'
        ) {
          return {
            status: value.status,
            onlyMentions: value.onlyMentions,
          };
        }
      }
    }
  } catch {
    // Storage unavailable. Use defaults.
  }

  return {
    status: 'online',
    onlyMentions: false,
  };
}

function containsMention(
  message: string,
  nickname: string,
): boolean {
  const escaped = nickname.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );

  return new RegExp(
    `@${escaped}(?![\\w-])`,
    'i',
  ).test(message);
}

export const usePresenceStore = defineStore(
  'presence',
  () => {
    const activeUserId = ref<number | null>(null);

    const status = ref<UserStatus>('online');

    const onlyMentions = ref(false);

    const pending = ref<IncomingMessage[]>([]);

    const notificationHistory =
      ref<NotificationEntry[]>([]);

    const unread = ref(0);

    const permission = ref<
      'granted' | 'denied' | 'default' | 'unsupported'
    >('unsupported');

    const pendingCount = computed(
      () => pending.value.length,
    );

    function refreshPermission() {
      permission.value =
        typeof Notification === 'undefined'
          ? 'unsupported'
          : Notification.permission;
    }

    function saveSettings() {
      if (activeUserId.value === null) return;

      try {
        localStorage.setItem(
          storageKey(activeUserId.value),
          JSON.stringify({
            status: status.value,
            onlyMentions: onlyMentions.value,
          }),
        );
      } catch {
        // Local storage is optional for the prototype.
      }
    }

    function loadUser(userId: number) {
      if (activeUserId.value === userId) return;

      activeUserId.value = userId;

      const settings = readSettings(userId);

      status.value = settings.status;
      onlyMentions.value = settings.onlyMentions;

      pending.value = [];
      notificationHistory.value = [];
      unread.value = 0;

      refreshPermission();
    }

    function getMemberStatus(
      userId: number,
    ): UserStatus {
      if (userId === activeUserId.value) {
        return status.value;
      }

      return readSettings(userId).status;
    }

    function setOnlyMentions(value: boolean) {
      onlyMentions.value = value;
      saveSettings();
    }

    async function requestPermission() {
      if (typeof Notification === 'undefined') {
        permission.value = 'unsupported';
        return;
      }

      permission.value =
        await Notification.requestPermission();
    }

    function markRead() {
      unread.value = 0;
    }

    // Simulates an incoming message.
    async function receiveDemo(
      message: IncomingMessage,
      appVisible: boolean,
      nickname: string,
    ): Promise<string> {
      if (status.value === 'offline') {
        pending.value.push(message);

        return 'Offline: message queued. It will appear when you switch to Online.';
      }

      const messages = useMessagesStore();

      await messages.send(
        message.channelId,
        message.sender,
        message.text,
      );

      // DND receives messages but disables notifications.
      if (status.value === 'dnd') {
        return 'DND: message received without notification.';
      }

      // Visible application -> no notification.
      if (appVisible) {
        return 'Message received. No notification because the app is visible.';
      }

      if (
        onlyMentions.value &&
        !containsMention(message.text, nickname)
      ) {
        return 'Message received. Notification skipped (mentions only).';
      }

      const channelName =
        messages.channels.find(
          (channel) =>
            channel.id === message.channelId,
        )?.name ?? 'channel';

      const entry: NotificationEntry = {
        ...message,
        channelName,
        id: Date.now(),
        createdAt: new Date().toISOString(),
      };

      notificationHistory.value.unshift(entry);

      notificationHistory.value =
        notificationHistory.value.slice(0, 20);

      unread.value += 1;

      // Browser notification.
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification(
          `${message.sender} · #${channelName}`,
          {
            body: message.text.slice(0, 100),
          },
        );
      }

      return 'Notification generated while the app was hidden.';
    }

    async function changeStatus(
      nextStatus: UserStatus,
    ): Promise<number> {
      status.value = nextStatus;

      saveSettings();

      if (nextStatus !== 'online') {
        return 0;
      }

      // Release incoming messages queued while Offline.
      const messages = useMessagesStore();

      const queued = [...pending.value];
      pending.value = [];

      let delivered = 0;

      for (const message of queued) {
        try {
          await messages.send(
            message.channelId,
            message.sender,
            message.text,
          );

          delivered += 1;
        } catch {
          // Channel may have been removed.
        }
      }

      // Refresh channels after coming Online.
      if (activeUserId.value !== null) {
        await messages.loadChannels(
          activeUserId.value,
        );
      }

      return delivered;
    }

    function clearSession() {
      activeUserId.value = null;

      status.value = 'online';
      onlyMentions.value = false;

      pending.value = [];
      notificationHistory.value = [];

      unread.value = 0;
    }

    return {
      status,
      onlyMentions,
      pendingCount,
      notificationHistory,
      unread,
      permission,

      loadUser,
      getMemberStatus,
      setOnlyMentions,
      requestPermission,
      markRead,
      receiveDemo,
      changeStatus,
      clearSession,
    };
  },
);

if (import.meta.hot) {
  import.meta.hot.accept(
    acceptHMRUpdate(
      usePresenceStore,
      import.meta.hot,
    ),
  );
}
