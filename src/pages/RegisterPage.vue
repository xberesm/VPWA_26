<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 380px; max-width: 90vw">
      <q-card-section>
        <div class="text-h5 text-center">Register</div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-input
          v-model="username"
          outlined
          label="Username"
        />

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

        <q-input
          v-model="confirmPassword"
          outlined
          label="Confirm password"
          type="password"
        />

        <q-btn
          label="Register"
          color="primary"
          class="full-width"
          @click="register"
        />

        <div class="text-center">
          Already have an account?
          <router-link to="/login">Login</router-link>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const router = useRouter()

const register = () => {
  localStorage.setItem('loggedIn', 'true')
  void router.push('/')
}
</script>
