import { defineRouter } from '#q-app';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import routes from './routes';
import { useAuthStore } from '@/stores/auth';

const TOKEN_KEY = 'vpwa_auth_token';

interface ProfileData {
  id: number;
  nickname: string;
  email: string;
}

// Overenie ulozeneho tokenu na backende
async function getUserFromToken(token: string): Promise<ProfileData> {
  const response = await fetch('http://localhost:3333/api/v1/account/profile', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Session is no longer valid.');
  }

  const result: unknown = await response.json();

  // AdonisJS moze vratit pouzivatela
  // priamo alebo v objekte data.
  const payload = result as {
    data?: ProfileData;
    id?: number;
    nickname?: string;
    email?: string;
  };

  const profile = payload.data ?? payload;

  if (
    typeof profile.id !== 'number' ||
    typeof profile.nickname !== 'string' ||
    typeof profile.email !== 'string'
  ) {
    throw new Error('Invalid profile response.');
  }

  return {
    id: profile.id,
    nickname: profile.nickname,
    email: profile.email,
  };
}

export default defineRouter(() => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({
      left: 0,
      top: 0,
    }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  // Obnovenie relacie staci skusit
  // iba pri prvom nacitani aplikacie.
  let sessionChecked = false;

  Router.beforeEach(async (to) => {
    const auth = useAuthStore();

    if (!sessionChecked) {
      sessionChecked = true;

      const savedToken =
        typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;

      if (savedToken && !auth.isLoggedIn) {
        try {
          // Backend musi potvrdit platnost tokenu
          const profile = await getUserFromToken(savedToken);

          auth.token = savedToken;
          auth.user = {
            id: profile.id,
            username: profile.nickname,
            email: profile.email,
          };
        } catch {
          auth.token = null;
          auth.user = null;

          sessionStorage.removeItem(TOKEN_KEY);
        }
      }
    }

    // Pri uspesnom prihlaseni ulozime token.
    // Pri odhlaseni ho odstranime.
    if (auth.isLoggedIn && auth.token) {
      sessionStorage.setItem(TOKEN_KEY, auth.token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }

    const publicPages = ['/login', '/register'];

    if (!auth.isLoggedIn && !publicPages.includes(to.path)) {
      return '/login';
    }

    if (auth.isLoggedIn && publicPages.includes(to.path)) {
      return '/';
    }

    return true;
  });

  return Router;
});
