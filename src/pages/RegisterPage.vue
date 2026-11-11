<template>
  <q-page class="flex flex-center">
    <q-card class="q-pa-lg" style="width: 420px; max-width: 90vw">
      <q-card-section>
        <div class="text-h5 text-center">Register</div>
      </q-card-section>

      <q-card-section>
        <q-form class="q-gutter-md" @submit="register">
          <q-banner v-if="error" dense rounded class="bg-negative text-white">
            {{ error }}
          </q-banner>

          <q-input
            v-model="firstName"
            outlined
            label="First name"
            autocomplete="given-name"
            :rules="[required]"
          />

          <q-input
            v-model="lastName"
            outlined
            label="Last name"
            autocomplete="family-name"
            :rules="[required]"
          />

          <q-input
            v-model="nickname"
            outlined
            label="Nickname"
            autocomplete="username"
            :rules="[required, validNickname]"
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
            :loading="loading"
            :disable="loading"
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const firstName = ref('');
const lastName = ref('');
const nickname = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');

const error = ref('');
const loading = ref(false);

const router = useRouter();
const auth = useAuthStore();

// Validacne pravidla formulara
const required = (val: string) => !!val.trim() || 'This field is required';

const validEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Enter a valid email';

const validNickname = (val: string) =>
  /^[a-zA-Z0-9_]{3,50}$/.test(val.trim()) || 'Use 3-50 letters, numbers or underscores';

const minLength = (val: string) =>
  (val.length >= 8 && val.length <= 32) || 'Password must have 8-32 characters';

const matchesPassword = (val: string) => val === password.value || 'Passwords do not match';

// Registracia cez AdonisJS backend
const register = async () => {
  error.value = '';
  loading.value = true;

  try {
    await auth.registerOnServer({
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      nickname: nickname.value.trim().toLowerCase(),
      email: email.value.trim().toLowerCase(),
      password: password.value,
      passwordConfirmation: confirmPassword.value,
    });

    await router.push('/');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Registration failed';
  } finally {
    loading.value = false;
  }
};
</script>
