import { defineStore, acceptHMRUpdate } from 'pinia';
import { computed, ref } from 'vue';
import * as api from '@/api';
import type { User } from '@/api';

// The logged-in user lives only in memory, like the local DB,
// so reloading the page or restarting the dev server logs you out.
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoggedIn = computed(() => user.value !== null);

  async function register(username: string, email: string, password: string) {
    user.value = await api.register(username, email, password);
  }

  async function login(email: string, password: string) {
    user.value = await api.login(email, password);
  }

  function logout() {
    user.value = null;
  }

  return { user, isLoggedIn, register, login, logout };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot));
}
