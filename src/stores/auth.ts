import { defineStore, acceptHMRUpdate } from 'pinia';
import { computed, ref } from 'vue';

import * as api from '@/api';
import type { User } from '@/api';

import {
  loginBackend,
  registerBackend,
  logoutBackend,
  type BackendUser,
  type RegisterData,
} from '@/api/authApi';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(null);

  const isLoggedIn = computed(() => user.value !== null);

  // Prevod pouzivatela z AdonisJS na format Quasaru
  function mapBackendUser(backendUser: BackendUser): User {
    if (!backendUser.nickname) {
      throw new Error('User has no nickname.');
    }

    return {
      id: backendUser.id,
      username: backendUser.nickname,
      email: backendUser.email,
    };
  }

  // Docasne povodne funkcie prototypu
  async function register(username: string, email: string, password: string) {
    user.value = await api.register(username, email, password);
  }

  async function login(email: string, password: string) {
    user.value = await api.login(email, password);
  }

  function logout() {
    user.value = null;
    token.value = null;
  }

  // Registracia cez skutocny AdonisJS backend
  async function registerOnServer(data: RegisterData) {
    const result = await registerBackend(data);

    user.value = mapBackendUser(result.user);
    token.value = result.token;
  }

  // Prihlasenie cez PostgreSQL
  async function loginOnServer(email: string, password: string) {
    const result = await loginBackend(email, password);

    user.value = mapBackendUser(result.user);
    token.value = result.token;
  }

  // Odhlasenie zo servera a zneplatnenie tokenu
  async function logoutFromServer() {
    if (token.value) {
      await logoutBackend(token.value);
    }

    token.value = null;
    user.value = null;
  }

  return {
    user,
    token,
    isLoggedIn,
    register,
    login,
    logout,
    registerOnServer,
    loginOnServer,
    logoutFromServer,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
