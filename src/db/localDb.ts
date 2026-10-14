
import type {
  Channel,
  Message,
  User,
} from '@/api';

// Temporary in-memory database.
// Data is reset when the page is refreshed.

export interface StoredUser extends User {
  password: string;
}

// Test accounts with password "heslo123".
const users: StoredUser[] = [
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
];

const now = new Date().toISOString();

const channels: Channel[] = [
  {
    id: 1,
    name: 'general',
    description: 'General discussion',
    private: false,
    invited: false,
    ownerId: 1,
    memberIds: [1, 2, 3],
    invitedUserIds: [],
    bannedUserIds: [],
    kickVotes: [],
    createdAt: now,
    lastActivityAt: now,
  },
  {
    id: 2,
    name: 'vpwa',
    description: 'VPWA project',
    private: false,
    invited: true,
    ownerId: 2,
    memberIds: [1, 2, 3],
    invitedUserIds: [1],
    bannedUserIds: [],
    kickVotes: [],
    createdAt: now,
    lastActivityAt: now,
  },
  {
    id: 3,
    name: 'private-team',
    description: 'Team only',
    private: true,
    invited: false,
    ownerId: 1,
    memberIds: [1, 2, 3],
    invitedUserIds: [],
    bannedUserIds: [],
    kickVotes: [],
    createdAt: now,
    lastActivityAt: now,
  },
];

// [channelId, author, text], oldest first.
const seed: [number, string, string][] = [
  [2, 'Anton', 'Kedy je odovzdanie?'],
  [2, 'Stevo', 'Do piatku'],
  [3, 'Jano', 'Toto je sukromny kanal'],

  ...Array.from(
    { length: 60 },
    (_, i): [number, string, string] => [
      1,
      ['Jano', 'Anton', 'Stevo'][i % 3] as string,
      i === 58
        ? '@Jano pozri sa na to'
        : `Sprava cislo ${i + 1}`,
    ],
  ),
];

const messages: Message[] = seed.map(
  ([channelId, author, text], i) => ({
    id: i + 1,
    channelId,
    author,
    text,
    createdAt: new Date(
      Date.now() - (seed.length - i) * 60_000,
    ).toISOString(),
  }),
);

export const db = {
  users,
  channels,
  messages,
};
