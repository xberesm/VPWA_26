<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 380px; max-width: 90vw">
      <q-card-section>
        <div class="text-h5 text-center">Login</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="login">
          <q-banner
            v-if="error"
            dense
            rounded
            class="bg-negative text-white"
          >
            {{ error }}
          </q-banner>

          <q-input
            v-model="email"
            outlined
            label="Email"
            type="email"
            autocomplete="email"
            :rules="[required, validEmail]"
          />

          <q-input
            v-model="password"
            outlined
            label="Password"
            type="password"
            autocomplete="current-password"
            :rules="[required]"
          />

          <q-btn
            label="Login"
            type="submit"
            color="primary"
            class="full-width"
          />

          <div class="text-center">
            Don't have an account?
            <router-link to="/register">Register</router-link>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const email = ref('')
const password = ref('')
const error = ref('')

const router = useRouter()
const auth = useAuthStore()

const required = (val: string) => !!val || 'This field is required'
const validEmail = (val: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Enter a valid email'

const login = async () => {
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    void router.push('/')
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>
