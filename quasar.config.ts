
import { defineConfig } from '#q-app';

export default defineConfig(() => ({
  boot: [],
  css: ['app.scss'],
  extras: ['roboto-font', 'material-icons'],

  build: {
    typescript: {
      strict: true,
      vueShim: true,
    },

    vueRouterMode: 'hash',

    vitePlugins: [
      [
        'vite-plugin-checker',
        {
          vueTsc: true,
          eslint: {
            lintCommand:
              'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
            useFlatConfig: true,
          },
        },
        { server: false },
      ],
    ],
  },

  devServer: {
    open: true,
  },

  framework: {
    config: {},
    plugins: ['AppVisibility'],
  },

  animations: [],

  ssr: {
    prodPort: 3000,
    middlewares: ['render'],
  },

  ssg: {},

  pwa: {
    workboxMode: 'GenerateSW',
  },

  cordova: {},

  capacitor: {
    hideSplashscreen: true,
  },

  electron: {
    preloadScripts: ['electron-preload'],
    inspectPort: 5858,
    bundler: 'packager',
    packager: {},
    builder: {
      appId: 'vpwa-26-voros-beres',
    },
  },

  bex: {
    extraScripts: [],
  },
}));
