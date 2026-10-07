<template>
  <q-page class="chat-page column no-wrap">
    <!-- kanal header-->
    <div class="row items-center justify-between q-pa-md">
      <div>
        <div class="text-h6">
          # general
        </div>

        <div class="text-caption text-grey-7">
          General discussion
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
    <div class="messages-area q-pa-md">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="{ 'mentioned-message': message.mentioned }"
        class="q-pa-xs rounded-borders"
      >
        <q-chat-message
          :name="message.author"
          :text="[message.text]"
          :stamp="message.time"
          :sent="message.author === 'Jano'"
        />
      </div>

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
import { ref } from 'vue'

const messageText = ref('')

const messages = ref([
  {
    id: 1,
    author: 'Jano',
    text: 'skuska',
    time: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    mentioned: false,
  },
  {
    id: 2,
    author: 'Stevo',
    text: '123456',
    time: '12:12',
    mentioned: true,
  },
  {
    id: 3,
    author: 'Stevo',
    text: 'Stevo',
    time: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    mentioned: false,
  },
])

function sendMessage() {
  const text = messageText.value.trim()

  if (text === '') {
    return
  }

  messages.value.push({
    id: Date.now(),
    author: 'Jano',
    text: text,
    time: new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    mentioned: false,
  })

  messageText.value = ''
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
