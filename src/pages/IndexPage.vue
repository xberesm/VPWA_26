
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
            (store.activeChannel
              ? 'Channel discussion'
              : 'Type /join channelName to get started')
          }}
        </div>
      </div>
      <q-btn flat round icon="info" :disable="!store.activeChannel" @click="infoDialog = true" />
    </div>
    <q-separator />

    <!-- Messages / infinite scroll -->
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
          :class="{ 'mentioned-message': isMentioned(message.text) }"
          class="q-pa-xs rounded-borders"
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

    <!-- UC11: typing status line -->
    <div v-if="canShowTyping && typingMember" class="typing-status row items-center q-px-md">
      <q-icon name="edit" size="16px" color="grey-7" />
      <q-btn
        flat dense no-caps
        color="primary"
        :label="typingMember.username"
        @click="typingDialog = true"
      />
      <span class="text-caption text-grey-7">is typing...</span>
      <q-space />
      <q-btn
        flat dense round
        size="sm"
        icon="replay"
        title="Restart typing demo"
        @click="startTypingSimulation"
      />
    </div>

    <!-- Command line -->
    <div class="command-bar q-pa-sm">
      <q-banner v-if="presence.status === 'offline'" dense class="bg-grey-3 text-grey-9 q-mb-sm">
        You are Offline. Incoming messages are paused; switch to Online to receive them.
      </q-banner>
      <q-banner
        v-if="feedback"
        dense rounded
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
        outlined dense
        placeholder="Message or command... (type /help)"
        :disable="busy"
        @keyup.enter="sendMessage"
      >
        <template #append>
          <q-btn flat round color="primary" icon="send" :disable="busy" @click="sendMessage" />
        </template>
      </q-input>
    </div>

    <!-- UC11: live typing preview -->
    <q-dialog v-model="typingDialog">
      <q-card style="width: 500px; max-width: 95vw">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">Live draft – {{ typingMember?.username }}</div>
          <q-badge color="orange">Typing · demo</q-badge>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div class="text-caption text-grey-7 q-mb-md">
            This is a first-phase simulation. Every character appears here before the message is sent.
          </div>
          <div class="live-draft q-pa-md rounded-borders">
            <span>{{ liveDraft }}</span><span class="typing-cursor">▍</span>
          </div>
          <q-banner v-if="typingError" class="bg-red-1 text-negative q-mt-md" dense rounded>
            {{ typingError }}
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat color="primary" icon="replay" label="Replay" @click="startTypingSimulation" />
          <q-btn
            flat color="primary" icon="send" label="Send demo message"
            :disable="!liveDraft.trim() || sendingDemo"
            :loading="sendingDemo"
            @click="sendDemoMessage"
          />
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Channel details -->
    <q-dialog v-model="infoDialog">
      <q-card style="width: 420px; max-width: 90vw">
        <q-card-section class="text-h6"># {{ store.activeChannel?.name }}</q-card-section>
        <q-card-section>
          <div>{{ store.activeChannel?.description || 'No description' }}</div>
          <div class="q-mt-sm">Type: {{ store.activeChannel?.private ? 'Private' : 'Public' }}</div>
          <div>Members: {{ store.members.length }}</div>
          <div>Owner: {{ store.members.find((m) => m.isOwner)?.username ?? '—' }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Close" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'
import { usePresenceStore } from '@/stores/presence'

const auth = useAuthStore()
const store = useMessagesStore()
const presence = usePresenceStore()

const messageText = ref('')
const messagesArea = ref<HTMLElement>()
const feedback = ref('')
const feedbackError = ref(false)
const busy = ref(false)
const infoDialog = ref(false)

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const isMentioned = (text: string) =>
  !!auth.user &&
  new RegExp(
    `@${auth.user.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`,
    'i',
  ).test(text)

async function onLoad(_index: number, done: (stop?: boolean) => void) {
  if (store.activeChannelId === null) return done(true)
  try {
    done(await store.loadOlder(store.activeChannelId))
  } catch {
    done(true)
  }
}

async function sendMessage() {
  const text = messageText.value.trim()
  if (!text || !auth.user || busy.value) return

  busy.value = true
  feedback.value = ''
  feedbackError.value = false

  try {
    if (text.startsWith('/')) {
      feedback.value = await store.runCommand(text, auth.user.id)
    } else {
      if (presence.status === 'offline') {
        throw new Error('You are Offline. Switch to Online before sending messages.')
      }
      if (store.activeChannelId === null) {
        throw new Error('Join a channel before sending a message. Type /join channelName.')
      }
      await store.send(store.activeChannelId, auth.user.username, text)
      await nextTick()
      messagesArea.value?.scrollTo({ top: messagesArea.value.scrollHeight })
    }
    messageText.value = ''
  } catch (error) {
    feedback.value = (error as Error).message
    feedbackError.value = true
  } finally {
    busy.value = false
  }
}

// UC11 - simulated peer typing in the currently selected channel.
// For phase 2 this can be replaced by WebSocket events from the backend.
const typingMember = computed(() =>
  store.members.find((member) => member.id !== auth.user?.id),
)
const canShowTyping = computed(() =>
  store.activeChannelId !== null &&
  !!typingMember.value &&
  presence.status !== 'offline',
)

const typingDialog = ref(false)
const liveDraft = ref('')
const typingError = ref('')
const sendingDemo = ref(false)

const sampleDrafts = [
  'skuska pisem pisem',
]

let typingTimer: ReturnType<typeof setInterval> | null = null
let sampleIndex = 0
let characterIndex = 0
let holdTicks = 0

function stopTypingSimulation() {
  if (typingTimer !== null) {
    clearInterval(typingTimer)
    typingTimer = null
  }
}

function startTypingSimulation() {
  stopTypingSimulation()
  typingError.value = ''
  liveDraft.value = ''
  characterIndex = 0
  holdTicks = 0

  if (!canShowTyping.value) return

  typingTimer = setInterval(() => {
    const draft = sampleDrafts[sampleIndex] ?? ''

    if (characterIndex < draft.length) {
      characterIndex += 1
      liveDraft.value = draft.slice(0, characterIndex)
      return
    }

    // Pause briefly, then demonstrate the next changing draft.
    holdTicks += 1
    if (holdTicks >= 12) {
      sampleIndex = (sampleIndex + 1) % sampleDrafts.length
      characterIndex = 0
      holdTicks = 0
      liveDraft.value = ''
    }
  }, 180)
}

// React to a changed channel, changed members, or Online/Offline status.
watch(
  [
    () => store.activeChannelId,
    () => typingMember.value?.id,
    () => presence.status,
  ],
  ([channelId, memberId, status]) => {
    if (channelId === null || memberId === undefined || status === 'offline') {
      stopTypingSimulation()
      typingDialog.value = false
      liveDraft.value = ''
      return
    }
    startTypingSimulation()
  },
  { immediate: true },
)

onBeforeUnmount(stopTypingSimulation)

async function sendDemoMessage() {
  const channelId = store.activeChannelId
  const peer = typingMember.value
  const text = liveDraft.value.trim()
  if (channelId === null || !peer || !text || sendingDemo.value) return

  sendingDemo.value = true
  typingError.value = ''
  try {
    await store.send(channelId, peer.username, text)
    await nextTick()
    messagesArea.value?.scrollTo({ top: messagesArea.value.scrollHeight })
    sampleIndex = (sampleIndex + 1) % sampleDrafts.length
    startTypingSimulation()
  } catch (error) {
    typingError.value = (error as Error).message
  } finally {
    sendingDemo.value = false
  }
}
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

.typing-status {
  min-height: 35px;
  border-top: 1px solid #eeeeee;
  background: #fafafa;
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
  50% { opacity: 0; }
}

.command-bar {
  background: white;
  border-top: 1px solid #dddddd;
}

.mentioned-message {
  background: #fff5d6;
  border-left: 4px solid #f2c037;
}
</style>
