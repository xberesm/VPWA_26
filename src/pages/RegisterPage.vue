<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 380px; max-width: 90vw">
      <q-card-section>
        <div class="text-h5 text-center">Register</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="register">
          <q-banner
            v-if="error"
            dense
            rounded
            class="bg-negative text-white"
          >
            {{ error }}
          </q-banner>

          <q-input
            v-model="username"
            outlined
            label="Username"
            autocomplete="username"
            :rules="[required]"
          />

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
            autocomplete="new-password"
            :rules="[required, minLength]"
          />

          <q-input
            v-model="confirmPassword"
            outlined
            label="Confirm password"
            type="password"
            autocomplete="new-password"
            :rules="[required, matchesPassword]"
          />

          <q-btn
            label="Register"
            type="submit"
            color="primary"
            class="full-width"
          />

          <div class="text-center">
            Already have an account?
            <router-link to="/login">Login</router-link>
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

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')

const router = useRouter()
const auth = useAuthStore()

const required = (val: string) => !!val || 'This field is required'
const validEmail = (val: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Enter a valid email'
const minLength = (val: string) =>
  val.length >= 6 || 'Password must be at least 6 characters'
const matchesPassword = (val: string) =>
  val === password.value || 'Passwords do not match'

const register = async () => {
  error.value = ''
  try {
    await auth.register(username.value, email.value, password.value)
    void router.push('/')
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>
