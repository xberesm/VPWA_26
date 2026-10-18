# VPWAchat (vpwa-26-voros-beres)

## Install the dependencies

```bash
pnpm install
# or: yarn/npm/bun install
```

### Start the app in development mode (HMR, error reporting, etc.)

```bash
quasar dev
```
### Existing TEMP users 

**FOR TESTING**

```json
{
    id: 1,
    username: 'Jano',
    email: 'jano@test.sk',
    password: 'heslo123',
  },
  {
    id: 2,
    username: 'Anton',
    email: 'anton@test.sk',
    password: 'heslo123',
  },
  {
    id: 3,
    username: 'Stevo',
    email: 'stevo@test.sk',
    password: 'heslo123',
  },
```
temporary in local db -> will be recreated in sql table


### Format & Lint the files

```bash
pnpm run lint
# or: yarn/npm/bun run lint
```

...or just check formatting & linting:

```bash
pnpm run lint:check
# or: yarn/npm/bun run lint:check
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-file).
