
<template>
  <q-layout view="hHh Lpr lFf">
    <!-- HEADER -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-btn
          flat dense round
          icon="menu"
          class="lt-md"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />

        <q-toolbar-title>
          VPWA Chat
        </q-toolbar-title>

        <q-btn
          flat dense round
          icon="group"
          class="lt-lg"
          @click="rightDrawerOpen = !rightDrawerOpen"
        />

        <div class="row items-center q-gutter-sm">
          <!-- UC9: CLICKABLE STATUS -->
          <q-btn-dropdown
            flat
            dense
            no-caps
            :label="statusLabel(presence.status)"
            :color="statusColor(presence.status)"
            dropdown-icon="arrow_drop_down"
          >
            <q-list style="min-width: 180px">
              <q-item-label header>
                My status
              </q-item-label>

              <q-item
                v-for="option in statusOptions"
                :key="option.value"
                clickable
                v-close-popup
                @click="setStatus(option.value)"
              >
                <q-item-section avatar>
                  <q-icon
                    name="circle"
                    :color="statusColor(option.value)"
                    size="12px"
                  />
                </q-item-section>

                <q-item-section>
                  {{ option.label }}
                </q-item-section>

                <q-item-section
                  v-if="presence.status === option.value"
                  side
                >
                  <q-icon name="check" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>

          <!-- UC8: NOTIFICATIONS -->
          <q-btn
            flat
            dense
            round
            icon="notifications"
            aria-label="Notification settings"
            @click="openNotifications"
          >
            <q-badge
              v-if="presence.unread > 0"
              floating
              color="negative"
            >
              {{ presence.unread }}
            </q-badge>
          </q-btn>

          <span class="gt-xs">
            {{ auth.user?.username }}
          </span>

          <q-avatar
            color="white"
            text-color="primary"
            size="34px"
          >
            {{ initials }}
          </q-avatar>

          <q-btn
            flat
            dense
            icon="logout"
            label="Logout"
            @click="logout"
          />
        </div>
      </q-toolbar>
    </q-header>

    <!-- CHANNELS -->
    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      :width="230"
      :breakpoint="700"
      bordered
      class="bg-grey-10 text-white"
    >
      <div class="q-pa-md text-subtitle1 text-weight-bold">
        Channels
      </div>

      <q-list>
        <q-item
          v-for="channel in messages.channels"
          :key="channel.id"
          clickable
          v-ripple
          :active="channel.id === messages.activeChannelId"
          active-class="bg-grey-8 text-white"
          @click="selectChannel(channel.id)"
        >
          <q-item-section avatar>
            <q-icon
              :name="channel.private ? 'lock' : 'tag'"
              size="20px"
            />
          </q-item-section>

          <q-item-section>
            <q-item-label>
              {{ channel.name }}
            </q-item-label>
          </q-item-section>

          <q-item-section
            v-if="isInvited(channel)"
            side
          >
            <q-badge color="orange">
              NEW
            </q-badge>
          </q-item-section>

          <q-item-section side>
            <q-btn
              dense
              flat
              round
              icon="more_vert"
              color="white"
              size="sm"
              @click.stop
            >
              <q-menu auto-close>
                <q-list style="min-width: 170px">
                  <q-item
                    clickable
                    @click="askChannelAction(channel, '/cancel')"
                  >
                    <q-item-section>
                      Leave channel
                    </q-item-section>
                  </q-item>

                  <q-item
                    v-if="channel.ownerId === auth.user?.id"
                    clickable
                    @click="askChannelAction(channel, '/quit')"
                  >
                    <q-item-section class="text-negative">
                      Delete channel
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-item-section>
        </q-item>

        <q-item
          v-if="messages.channels.length === 0"
          class="text-grey-5"
        >
          <q-item-section>
            No channels yet. Create or join one.
          </q-item-section>
        </q-item>

        <q-separator dark class="q-my-sm" />

        <q-item
          clickable
          v-ripple
          @click="createDialog = true"
        >
          <q-item-section avatar>
            <q-icon name="add" />
          </q-item-section>

          <q-item-section>
            Create channel
          </q-item-section>
        </q-item>

        <q-item
          clickable
          v-ripple
          @click="openExplore"
        >
          <q-item-section avatar>
            <q-icon name="explore" />
          </q-item-section>

          <q-item-section>
            Browse public channels
          </q-item-section>
        </q-item>
      </q-list>

      <q-banner
        v-if="actionMessage"
        class="bg-grey-8 text-white q-ma-sm"
        dense
        rounded
      >
        {{ actionMessage }}

        <template #action>
          <q-btn
            flat
            dense
            label="OK"
            color="white"
            @click="actionMessage = ''"
          />
        </template>
      </q-banner>
    </q-drawer>

    <!-- MEMBERS -->
    <q-drawer
      v-model="rightDrawerOpen"
      side="right"
      show-if-above
      :width="210"
      :breakpoint="1000"
      bordered
    >
      <div class="q-pa-md text-subtitle1 text-weight-bold">
        Members
      </div>

      <q-list>
        <q-item
          v-for="member in messages.members"
          :key="member.id"
        >
          <q-item-section avatar>
            <q-icon
              name="circle"
              :color="statusColor(
                presence.getMemberStatus(member.id)
              )"
              size="10px"
            />
          </q-item-section>

          <q-item-section>
            <q-item-label>
              {{ member.username }}
            </q-item-label>

            <q-item-label caption>
              {{
                statusLabel(
                  presence.getMemberStatus(member.id)
                )
              }}
              {{ member.isOwner ? ' · Channel owner' : '' }}
            </q-item-label>
          </q-item-section>
        </q-item>

        <q-item v-if="messages.members.length === 0">
          <q-item-section class="text-grey">
            No active channel
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- MAIN CONTENT -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- UC8: NOTIFICATION SETTINGS -->
    <q-dialog v-model="notificationsDialog">
      <q-card style="width: 490px; max-width: 95vw">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">
            Notifications
          </div>

          <q-btn
            flat dense round
            icon="close"
            v-close-popup
          />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-gutter-md">
          <q-toggle
            v-model="mentionsOnly"
            label="Only notify me about @mentions"
          />

          <div class="text-caption text-grey-7">
            Desktop notifications are sent only when
            the app is hidden and your status is Online.
            DND silences notifications; Offline queues
            incoming demo messages.
          </div>

          <div class="row items-center q-gutter-sm">
            <q-btn
              outline
              color="primary"
              icon="notifications_active"
              label="Enable browser notifications"
              :disable="
                presence.permission === 'granted' ||
                presence.permission === 'unsupported'
              "
              @click="requestBrowserNotifications"
            />

            <q-badge
              :color="
                presence.permission === 'granted'
                  ? 'positive'
                  : 'grey'
              "
            >
              {{ presence.permission }}
            </q-badge>
          </div>

          <q-separator />

          <div class="text-subtitle2">
            Test without a backend
          </div>

          <div class="text-caption text-grey-7">
            Choose a channel with another member,
            click a test button, then switch to
            another tab within 6 seconds.
          </div>

          <div class="row q-gutter-sm">
            <q-btn
              color="primary"
              outline
              no-caps
              label="Test normal message"
              :disable="testScheduled"
              @click="scheduleDemo(false)"
            />

            <q-btn
              color="primary"
              outline
              no-caps
              label="Test @mention"
              :disable="testScheduled"
              @click="scheduleDemo(true)"
            />
          </div>

          <q-banner
            v-if="demoFeedback"
            dense
            rounded
            class="bg-blue-1 text-primary"
          >
            {{ demoFeedback }}
          </q-banner>

          <q-banner
            v-if="presence.pendingCount > 0"
            dense
            rounded
            class="bg-orange-1 text-dark"
          >
            {{ presence.pendingCount }} message(s)
            waiting until you go Online.
          </q-banner>

          <q-separator />

          <div class="text-subtitle2">
            Notifications received while hidden
          </div>

          <q-list
            v-if="presence.notificationHistory.length"
            dense
            bordered
            separator
          >
            <q-item
              v-for="entry in presence.notificationHistory"
              :key="entry.id"
            >
              <q-item-section>
                <q-item-label>
                  {{ entry.sender }} · #{{ entry.channelName }}
                </q-item-label>

                <q-item-label caption>
                  {{ entry.text }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>

          <div
            v-else
            class="text-caption text-grey-7"
          >
            No notifications yet.
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Close"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- CREATE CHANNEL -->
    <q-dialog v-model="createDialog">
      <q-card style="width: 420px; max-width: 90vw">
        <q-form @submit="handleCreateChannel">
          <q-card-section>
            <div class="text-h6">
              Create channel
            </div>
          </q-card-section>

          <q-card-section class="q-gutter-md">
            <q-input
              v-model="newChannelName"
              outlined
              label="Channel name"
              :rules="[
                (val: string) =>
                  !!val.trim() ||
                  'Channel name is required'
              ]"
            />

            <q-input
              v-model="newChannelDescription"
              outlined
              label="Description"
            />

            <q-toggle
              v-model="newChannelPrivate"
              label="Private channel"
            />

            <q-banner
              v-if="createError"
              class="bg-negative text-white"
              rounded
            >
              {{ createError }}
            </q-banner>
          </q-card-section>

          <q-card-actions align="right">
            <q-btn
              flat
              label="Cancel"
              v-close-popup
            />

            <q-btn
              color="primary"
              label="Create"
              type="submit"
              :loading="creatingChannel"
            />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <!-- BROWSE PUBLIC CHANNELS -->
    <q-dialog v-model="exploreDialog">
      <q-card style="width: 430px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">
            Browse public channels
          </div>
        </q-card-section>

        <q-card-section>
          <q-list separator>
            <q-item
              v-for="channel in publicChannels"
              :key="channel.id"
            >
              <q-item-section>
                <q-item-label>
                  # {{ channel.name }}
                </q-item-label>

                <q-item-label caption>
                  {{
                    channel.description ||
                    'Public channel'
                  }}
                </q-item-label>
              </q-item-section>

              <q-item-section side>
                <q-btn
                  flat
                  color="primary"
                  label="Join"
                  :loading="joining"
                  @click="joinPublic(channel.name)"
                />
              </q-item-section>
            </q-item>

            <q-item
              v-if="publicChannels.length === 0"
            >
              <q-item-section>
                No available public channels.
              </q-item-section>
            </q-item>
          </q-list>

          <q-banner
            v-if="exploreError"
            class="bg-negative text-white q-mt-md"
            rounded
          >
            {{ exploreError }}
          </q-banner>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Close"
            v-close-popup
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- CONFIRM CHANNEL ACTION -->
    <q-dialog v-model="confirmDialog">
      <q-card style="width: 400px; max-width: 90vw">
        <q-card-section class="text-h6">
          Confirm action
        </q-card-section>

        <q-card-section>
          {{ confirmText }}
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancel"
            v-close-popup
          />

          <q-btn
            color="negative"
            label="Confirm"
            :loading="processingAction"
            @click="confirmChannelAction"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue';

import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';

import { useAuthStore } from '@/stores/auth';
import { useMessagesStore } from '@/stores/messages';
import {
  usePresenceStore,
  type UserStatus,
} from '@/stores/presence';

import type { Channel } from '@/api';

const router = useRouter();
const $q = useQuasar();

const auth = useAuthStore();
const messages = useMessagesStore();
const presence = usePresenceStore();

// UC9: USER PRESENCE

const statusOptions: {
  value: UserStatus;
  label: string;
}[] = [
  {
    value: 'online',
    label: 'Online',
  },
  {
    value: 'dnd',
    label: 'Do not disturb',
  },
  {
    value: 'offline',
    label: 'Offline',
  },
];

const statusColor = (value: UserStatus) =>
  value === 'online'
    ? 'positive'
    : value === 'dnd'
      ? 'orange'
      : 'grey';

const statusLabel = (value: UserStatus) =>
  value === 'online'
    ? 'Online'
    : value === 'dnd'
      ? 'DND'
      : 'Offline';

const notificationsDialog = ref(false);
const demoFeedback = ref('');
const testScheduled = ref(false);

let demoTimer: ReturnType<typeof setTimeout> | null =
  null;

const mentionsOnly = computed({
  get: () => presence.onlyMentions,

  set: (value: boolean) =>
    presence.setOnlyMentions(value),
});

async function setStatus(value: UserStatus) {
  try {
    const delivered =
      await presence.changeStatus(value);

    demoFeedback.value =
      delivered > 0
        ? `Back online: ${delivered} queued message(s) loaded and channels refreshed.`
        : `Status changed to ${statusLabel(value)}.`;
  } catch (error) {
    demoFeedback.value =
      (error as Error).message;
  }
}

// UC8: NOTIFICATIONS

function openNotifications() {
  presence.markRead();
  notificationsDialog.value = true;
}

async function requestBrowserNotifications() {
  try {
    await presence.requestPermission();
  } catch (error) {
    demoFeedback.value =
      (error as Error).message;
  }
}

function scheduleDemo(mention: boolean) {
  if (
    !auth.user ||
    messages.activeChannelId === null
  ) {
    demoFeedback.value =
      'Select a channel first.';
    return;
  }

  const other = messages.members.find(
    (member) =>
      member.id !== auth.user?.id,
  );

  if (!other) {
    demoFeedback.value =
      'Invite another user to this channel to test incoming messages.';
    return;
  }

  const receiverId = auth.user.id;
  const nickname = auth.user.username;

  const sample = {
    channelId: messages.activeChannelId,
    sender: other.username,
    text: mention
      ? `@${nickname} Can you check this message?`
      : 'Hey, a new message just arrived!',
  };

  demoFeedback.value =
    'Message scheduled in 6 seconds. Switch to another tab to test the notification.';

  testScheduled.value = true;

  demoTimer = setTimeout(() => {
    demoTimer = null;
    testScheduled.value = false;

    if (auth.user?.id !== receiverId) {
      return;
    }

    void (async () => {
      try {
        demoFeedback.value =
          await presence.receiveDemo(
            sample,
            $q.appVisible,
            nickname,
          );
      } catch (error) {
        demoFeedback.value =
          (error as Error).message;
      }
    })();
  }, 6000);
}

onBeforeUnmount(() => {
  if (demoTimer !== null) {
    clearTimeout(demoTimer);
  }
});

// EXISTING LAYOUT LOGIC

const initials = computed(() =>
  (auth.user?.username ?? '')
    .slice(0, 2)
    .toUpperCase(),
);

const leftDrawerOpen = ref(false);
const rightDrawerOpen = ref(false);

const createDialog = ref(false);
const newChannelName = ref('');
const newChannelDescription = ref('');
const newChannelPrivate = ref(false);
const createError = ref('');
const creatingChannel = ref(false);

const actionMessage = ref('');

const exploreDialog = ref(false);
const publicChannels = ref<Channel[]>([]);
const exploreError = ref('');
const joining = ref(false);

const confirmDialog = ref(false);

const pendingAction = ref<{
  channelId: number;
  command: '/cancel' | '/quit';
} | null>(null);

const processingAction = ref(false);

const confirmText = computed(() => {
  if (!pendingAction.value) return '';

  const channel = messages.channels.find(
    (c) =>
      c.id === pendingAction.value?.channelId,
  );

  if (!channel) return '';

  if (
    pendingAction.value.command === '/quit' ||
    channel.ownerId === auth.user?.id
  ) {
    return `You are the owner. This will permanently delete #${channel.name} for everyone. Continue?`;
  }

  return `Do you want to leave #${channel.name}?`;
});

onMounted(async () => {
  if (auth.user) {
    presence.loadUser(auth.user.id);

    try {
      await messages.loadChannels(
        auth.user.id,
      );
    } catch (error) {
      actionMessage.value =
        (error as Error).message;
    }
  }
});

const isInvited = (channel: Channel) =>
  !!auth.user &&
  channel.invitedUserIds.includes(
    auth.user.id,
  );

async function selectChannel(id: number) {
  try {
    await messages.selectChannel(id);
    leftDrawerOpen.value = false;
  } catch (error) {
    actionMessage.value =
      (error as Error).message;
  }
}

async function handleCreateChannel() {
  if (!auth.user || creatingChannel.value) {
    return;
  }

  createError.value = '';
  creatingChannel.value = true;

  try {
    await messages.createChannel(
      newChannelName.value,
      newChannelDescription.value,
      newChannelPrivate.value,
      auth.user.id,
    );

    createDialog.value = false;
    newChannelName.value = '';
    newChannelDescription.value = '';
    newChannelPrivate.value = false;
  } catch (error) {
    createError.value =
      (error as Error).message;
  } finally {
    creatingChannel.value = false;
  }
}

async function openExplore() {
  if (!auth.user) return;

  exploreError.value = '';

  try {
    publicChannels.value =
      await messages.getPublicChannels(
        auth.user.id,
      );

    exploreDialog.value = true;
  } catch (error) {
    actionMessage.value =
      (error as Error).message;
  }
}

async function joinPublic(name: string) {
  if (!auth.user || joining.value) {
    return;
  }

  joining.value = true;
  exploreError.value = '';

  try {
    actionMessage.value =
      await messages.runCommand(
        `/join ${name}`,
        auth.user.id,
      );

    exploreDialog.value = false;
  } catch (error) {
    exploreError.value =
      (error as Error).message;
  } finally {
    joining.value = false;
  }
}

function askChannelAction(
  channel: Channel,
  command: '/cancel' | '/quit',
) {
  pendingAction.value = {
    channelId: channel.id,
    command,
  };

  confirmDialog.value = true;
}

async function confirmChannelAction() {
  if (
    !auth.user ||
    !pendingAction.value ||
    processingAction.value
  ) {
    return;
  }

  processingAction.value = true;

  try {
    await messages.selectChannel(
      pendingAction.value.channelId,
    );

    actionMessage.value =
      await messages.runCommand(
        pendingAction.value.command,
        auth.user.id,
      );

    confirmDialog.value = false;
  } catch (error) {
    actionMessage.value =
      (error as Error).message;

    confirmDialog.value = false;
  } finally {
    processingAction.value = false;
    pendingAction.value = null;
  }
}

function logout() {
  if (demoTimer !== null) {
    clearTimeout(demoTimer);
  }

  presence.clearSession();
  messages.reset();
  auth.logout();

  void router.push('/login');
}
</script>
