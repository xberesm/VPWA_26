<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 380px; max-width: 90vw">
      <q-card-section>
        <div class="text-h5 text-center">Login</div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-input
          v-model="email"
          outlined
          label="Email"
          type="email"
        />

        <q-input
          v-model="password"
          outlined
          label="Password"
          type="password"
        />

        <q-btn
          label="Login"
          color="primary"
          class="full-width"
          @click="login"
        />

        <div class="text-center">
          Don't have an account?
          <router-link to="/register">Register</router-link>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')

const router = useRouter()

const login = () => {
  localStorage.setItem('loggedIn', 'true')
  void router.push('/')
}
</script>
