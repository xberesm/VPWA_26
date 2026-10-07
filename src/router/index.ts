import { defineRouter } from '#q-app';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import routes from './routes';

export default defineRouter(() => {
  const createHistory = import.meta.env.QUASAR_SERVER
    ? createMemoryHistory
    : import.meta.env.QUASAR_VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(import.meta.env.QUASAR_VUE_ROUTER_BASE),
  });

  Router.beforeEach((to) => {
    const loggedIn = localStorage.getItem('loggedIn') === 'true';

    const publicPages = ['/login', '/register'];

    // Not logged in -> only Login and Register are accessible
    if (!loggedIn && !publicPages.includes(to.path)) {
      return '/login';
    }

    // Already logged in -> don't show Login/Register
    if (loggedIn && publicPages.includes(to.path)) {
      return '/';
    }

    return true;
  });

  return Router;
});
