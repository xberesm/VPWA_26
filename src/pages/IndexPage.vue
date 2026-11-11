<template>
  <q-page class="chat-page column no-wrap">
    <!-- Channel heading -->
    <div class="row items-center justify-between q-pa-md">
      <div>
        <div class="text-h6">
          {{ store.activeChannel ? `# ${store.activeChannel.name}` : 'Welcome to VPWA Chat' }}
        </div>

        <div class="text-caption text-grey-7">
          {{
            store.activeChannel?.description ||
            (store.activeChannel ? 'Channel discussion' : 'Type /join channelName to get started')
          }}
        </div>
      </div>

      <div class="row items-center q-gutter-sm">
        <!-- UC11 zostava dostupne ako jasne oznacene demo -->
        <q-btn
          v-if="canShowTyping"
          outline
          dense
          no-caps
          color="grey-7"
          icon="edit"
          label="Typing demo"
          @click="openTypingDemo"
        />

        <q-btn flat round icon="info" :disable="!store.activeChannel" @click="infoDialog = true" />
      </div>
    </div>

    <q-separator />

    <!-- Realne spravy z PostgreSQL -->
    <div ref="messagesArea" class="messages-area scroll-y q-pa-md">
      <q-infinite-scroll
        v-if="store.activeChannelId !== null"
        :key="store.activeChannelId"
        reverse
        @load="onLoad"
      >
        <template #loading>
          <div class="row justify-center q-my-md">
            <q-spinner color="primary" size="32px" />
          </div>
        </template>

        <div
          v-for="message in store.activeMessages"
          :key="message.id"
          class="q-pa-xs rounded-borders"
          :class="{
            'mentioned-message': isMentioned(message.text),
          }"
        >
          <q-chat-message
            :name="message.author"
            :text="[message.text]"
            :stamp="formatTime(message.createdAt)"
            :sent="message.author === auth.user?.username"
          />
        </div>
      </q-infinite-scroll>

      <div v-if="!store.activeChannel" class="text-grey-7 q-pa-md">
        You are not in any channel yet. Create one on the left or type
        <strong>/join general</strong>.
      </div>
    </div>

    <!-- Command line -->
    <div class="command-bar q-pa-sm">
      <q-banner v-if="presence.status === 'offline'" dense class="bg-grey-3 text-grey-9 q-mb-sm">
        Your status is Offline. Switch to Online to send messages.
      </q-banner>

      <q-banner
        v-if="feedback"
        dense
        rounded
        :class="feedbackError ? 'bg-red-1 text-negative' : 'bg-blue-1 text-primary'"
        class="q-mb-sm"
      >
        {{ feedback }}

        <template #action>
          <q-btn dense flat icon="close" @click="feedback = ''" />
        </template>
      </q-banner>

      <q-input
        v-model="messageText"
        outlined
        dense
        placeholder="Message or command... (type /help)"
        :disable="busy"
        @keyup.enter="sendMessage"
      >
        <template #append>
          <q-btn
            flat
            round
            color="primary"
            icon="send"
            :loading="busy"
            :disable="busy"
            @click="sendMessage"
          />
        </template>
      </q-input>
    </div>

    <!-- UC11: iba explicitne spustena simulacia -->
    <q-dialog v-model="typingDialog">
      <q-card style="width: 500px; max-width: 95vw">
        <q-card-section>
          <div class="text-h6">Typing preview – {{ typingMember?.username }}</div>

          <div class="text-caption text-grey-7 q-mt-sm">
            Demo for UC11. This is a simulated typing preview, not a real message from another user.
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="live-draft q-pa-md rounded-borders">
            <span>{{ liveDraft }}</span>
            <span class="typing-cursor">▍</span>
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            color="primary"
            icon="replay"
            label="Replay demo"
            @click="startTypingSimulation"
          />

          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Channel details -->
    <q-dialog v-model="infoDialog">
      <q-card style="width: 420px; max-width: 90vw">
        <q-card-section class="text-h6"> # {{ store.activeChannel?.name }} </q-card-section>

        <q-card-section>
          <div>
            {{ store.activeChannel?.description || 'No description' }}
          </div>

          <div class="q-mt-sm">
            Type:
            {{ store.activeChannel?.private ? 'Private' : 'Public' }}
          </div>

          <div>Members: {{ store.members.length }}</div>

          <div>
            Owner:
            {{ store.members.find((m) => m.isOwner)?.username ?? '—' }}
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { useAuthStore } from '@/stores/auth';
import { useMessagesStore } from '@/stores/messages';
import { usePresenceStore } from '@/stores/presence';

const auth = useAuthStore();
const store = useMessagesStore();
const presence = usePresenceStore();

const messageText = ref('');
const messagesArea = ref<HTMLElement>();
const feedback = ref('');
const feedbackError = ref(false);
const busy = ref(false);
const infoDialog = ref(false);

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

// UC6 - Zvyraznenie @nickname
const isMentioned = (text: string) =>
  !!auth.user &&
  new RegExp(`@${auth.user.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i').test(
    text,
  );

// UC7 - Historia / infinite scroll
async function onLoad(_index: number, done: (stop?: boolean) => void) {
  if (store.activeChannelId === null) {
    done(true);
    return;
  }

  try {
    const stop = await store.loadOlder(store.activeChannelId);
    done(stop);
  } catch {
    done(true);
  }
}

// UC3 a UC4 - Spravy a prikazy
async function sendMessage() {
  const text = messageText.value.trim();

  if (!text || !auth.user || busy.value) {
    return;
  }

  busy.value = true;
  feedback.value = '';
  feedbackError.value = false;

  try {
    if (text.startsWith('/')) {
      feedback.value = await store.runCommand(text, auth.user.id);
    } else {
      if (presence.status === 'offline') {
        throw new Error('Switch to Online before sending messages.');
      }

      if (store.activeChannelId === null) {
        throw new Error('Join a channel first. Type /join channelName.');
      }

      await store.send(store.activeChannelId, auth.user.username, text);

      await nextTick();

      messagesArea.value?.scrollTo({
        top: messagesArea.value.scrollHeight,
      });
    }

    messageText.value = '';
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : 'Something went wrong.';

    feedbackError.value = true;
  } finally {
    busy.value = false;
  }
}

// UC11 - Samostatna demonstracia pisania
const typingMember = computed(() => store.members.find((member) => member.id !== auth.user?.id));

const canShowTyping = computed(() => store.activeChannelId !== null && !!typingMember.value);

const typingDialog = ref(false);
const liveDraft = ref('');

const typingSample = 'Testing the live typing preview for VPWA Chat.';

let typingTimer: ReturnType<typeof setInterval> | null = null;

function stopTypingSimulation() {
  if (typingTimer !== null) {
    clearInterval(typingTimer);
    typingTimer = null;
  }
}

function startTypingSimulation() {
  stopTypingSimulation();

  liveDraft.value = '';

  if (!typingDialog.value) {
    return;
  }

  let index = 0;

  typingTimer = setInterval(() => {
    if (index >= typingSample.length) {
      stopTypingSimulation();
      return;
    }

    index += 1;
    liveDraft.value = typingSample.slice(0, index);
  }, 120);
}

function openTypingDemo() {
  if (!canShowTyping.value) {
    return;
  }

  typingDialog.value = true;
  startTypingSimulation();
}

watch(typingDialog, (opened) => {
  if (!opened) {
    stopTypingSimulation();
  }
});

watch(
  () => store.activeChannelId,
  () => {
    typingDialog.value = false;
    stopTypingSimulation();
  },
);

onBeforeUnmount(stopTypingSimulation);
</script>

<style scoped lang="scss">
.chat-page {
  height: calc(100vh - 50px);
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.command-bar {
  background: white;
  border-top: 1px solid #dddddd;
}

.mentioned-message {
  background: #fff5d6;
  border-left: 4px solid #f2c037;
}

.live-draft {
  min-height: 100px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
}

.typing-cursor {
  color: #1976d2;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
