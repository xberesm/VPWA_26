<template>
  <q-page class="chat-page column no-wrap">
    <!-- kanal header-->
    <div class="row items-center justify-between q-pa-md">
      <div>
        <div class="text-h6">
          # {{ store.activeChannel?.name }}
        </div>

        <div class="text-caption text-grey-7">
          {{ store.activeChannel?.description }}
        </div>
      </div>

      <q-btn
        flat
        round
        icon="info"
      />
    </div>

    <q-separator />

    <!-- mess -->
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

      <div class="text-caption text-grey-7 q-mt-md">
        Ed is typing...
      </div>
    </div>

    <!-- cmnd line -->
    <div class="command-bar q-pa-sm">
      <q-input
        v-model="messageText"
        outlined
        dense
        placeholder="Message or command..."
        @keyup.enter="sendMessage"
      >
        <template #append>
          <q-btn
            flat
            round
            color="primary"
            icon="send"
            @click="sendMessage"
          />
        </template>
      </q-input>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'

const auth = useAuthStore()
const store = useMessagesStore()

const messageText = ref('')
const messagesArea = ref<HTMLElement>()

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const isMentioned = (text: string) =>
  !!auth.user && text.includes(`@${auth.user.username}`)

async function onLoad(_index: number, done: (stop?: boolean) => void) {
  if (store.activeChannelId === null) return done(true)
  done(await store.loadOlder(store.activeChannelId))
}

async function sendMessage() {
  const text = messageText.value.trim()

  if (text === '' || store.activeChannelId === null || !auth.user) {
    return
  }

  messageText.value = ''
  await store.send(store.activeChannelId, auth.user.username, text)

  await nextTick()
  messagesArea.value?.scrollTo({ top: messagesArea.value.scrollHeight })
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

.command-bar {
  background: white;
  border-top: 1px solid #dddddd;
}

.mentioned-message {
  background: #fff5d6;
  border-left: 4px solid #f2c037;
}
</style>
