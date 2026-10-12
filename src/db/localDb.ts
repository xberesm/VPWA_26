import type { Channel, Message, User } from '@/api';

// Temporary in-memory database. Resets on page reload.

export interface StoredUser extends User {
  password: string;
}

// Test accounts, all with password "heslo123"
const users: StoredUser[] = [
  { id: 1, username: 'Jano', email: 'jano@test.sk', password: 'heslo123' },
  { id: 2, username: 'Anton', email: 'anton@test.sk', password: 'heslo123' },
  { id: 3, username: 'Stevo', email: 'stevo@test.sk', password: 'heslo123' },
];

const channels: Channel[] = [
  { id: 1, name: 'general', description: 'General discussion', private: false, invited: false },
  { id: 2, name: 'vpwa', description: 'VPWA project', private: false, invited: true },
  { id: 3, name: 'private-team', description: 'Team only', private: true, invited: false },
];

// [channelId, author, text], oldest first
const seed: [number, string, string][] = [
  [2, 'Anton', 'Kedy je odovzdanie?'],
  [2, 'Stevo', 'Do piatku'],
  [3, 'Jano', 'Toto je sukromny kanal'],
  // 60 messages in #general so infinite scroll has something to load
  ...Array.from({ length: 60 }, (_, i): [number, string, string] => [
    1,
    ['Jano', 'Anton', 'Stevo'][i % 3] as string,
    i === 58 ? '@Jano pozri sa na to' : `Sprava cislo ${i + 1}`,
  ]),
];

const messages: Message[] = seed.map(([channelId, author, text], i) => ({
  id: i + 1,
  channelId,
  author,
  text,
  createdAt: new Date(Date.now() - (seed.length - i) * 60_000).toISOString(),
}));

export const db = { users, channels, messages };
