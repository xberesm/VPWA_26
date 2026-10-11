<template>
  <q-layout view="hHh Lpr lFf">
    <!-- HEADER -->
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <!-- Na mobile otvorí zoznam kanálov -->
        <q-btn
          flat
          dense
          round
          icon="menu"
          class="lt-md"
          @click="leftDrawerOpen = !leftDrawerOpen"
        />

        <q-toolbar-title>
          VPWA Chat
        </q-toolbar-title>

        <!-- Na menšej obrazovke otvorí členov -->
        <q-btn
          flat
          dense
          round
          icon="group"
          class="lt-lg"
          @click="rightDrawerOpen = !rightDrawerOpen"
        />

        <div class="row items-center q-gutter-sm">
          <q-badge color="positive">
            online
          </q-badge>

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
          @click="messages.activeChannelId = channel.id"
          active-class="bg-grey-8 text-white"
        >
          <q-item-section avatar>
            <q-icon
              :name="channel.private ? 'lock' : 'tag'"
              size="20px"
            />
          </q-item-section>

          <q-item-section>
            {{ channel.name }}
          </q-item-section>

          <q-item-section
            v-if="channel.invited"
            side
          >
            <q-badge color="orange">
              NEW
            </q-badge>
          </q-item-section>
        </q-item>

        <q-separator dark class="q-my-sm" />

        <q-item clickable v-ripple>
          <q-item-section avatar>
            <q-icon name="add" />
          </q-item-section>

          <q-item-section>
            Create channel
          </q-item-section>
        </q-item>
      </q-list>
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
          v-for="member in members"
          :key="member.name"
        >
          <q-item-section avatar>
            <q-icon
              name="circle"
              :color="member.online ? 'positive' : 'grey'"
              size="10px"
            />
          </q-item-section>

          <q-item-section>
            {{ member.name }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- OBSAH STRÁNKY -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessagesStore } from '@/stores/messages'

const router = useRouter()
const auth = useAuthStore()
const messages = useMessagesStore()

onMounted(() => void messages.loadChannels())

const initials = computed(() =>
  (auth.user?.username ?? '').slice(0, 2).toUpperCase()
)

const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(false)

const logout = () => {
  auth.logout()
  void router.push('/login')
}

const members = [
  {
    name: 'Jano',
    online: true,
  },
  {
    name: 'Anton',
    online: true,
  },
  {
    name: 'Stevo',
    online: true,
  },
]
</script>
