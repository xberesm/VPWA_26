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
            Matus
          </span>

          <q-avatar
            color="white"
            text-color="primary"
            size="34px"
          >
            MB
          </q-avatar>
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
          v-for="channel in channels"
          :key="channel.name"
          clickable
          v-ripple
          :active="channel.name === 'general'"
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
import { ref } from 'vue'

const leftDrawerOpen = ref(false)
const rightDrawerOpen = ref(false)

const channels = [
  {
    name: 'general',
    private: false,
    invited: false,
  },
  {
    name: 'vpwa',
    private: false,
    invited: true,
  },
  {
    name: 'private-team',
    private: true,
    invited: false,
  },
]

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
  }
]
</script>
