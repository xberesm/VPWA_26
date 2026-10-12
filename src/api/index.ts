import { db } from '@/db/localDb';

// The only place the app talks to "the server".
// When the backend exists, replace these function bodies with HTTP calls.

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Channel {
  id: number;
  name: string;
  description: string;
  private: boolean;
  invited: boolean;
}

export interface Message {
  id: number;
  channelId: number;
  author: string;
  text: string;
  createdAt: string; // ISO date
}

const delay = () => new Promise((resolve) => setTimeout(resolve, 300));

export async function login(email: string, password: string): Promise<User> {
  await delay();
  const found = db.users.find(
    (u) => u.email === email.trim().toLowerCase() && u.password === password,
  );
  if (!found) throw new Error('Invalid email or password');
  return { id: found.id, username: found.username, email: found.email };
}

export async function register(username: string, email: string, password: string): Promise<User> {
  await delay();
  const newUser = {
    id: db.users.length + 1,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
  };
  if (db.users.some((u) => u.email === newUser.email)) {
    throw new Error('An account with this email already exists');
  }
  if (db.users.some((u) => u.username === newUser.username)) {
    throw new Error('This username is already taken');
  }
  db.users.push(newUser);
  return { id: newUser.id, username: newUser.username, email: newUser.email };
}

export async function getChannels(): Promise<Channel[]> {
  await delay();
  return [...db.channels];
}

// Returns up to `limit` messages older than `beforeId`, oldest first.
export async function getMessages(
  channelId: number,
  beforeId?: number,
  limit = 20,
): Promise<Message[]> {
  await delay();
  return db.messages
    .filter((m) => m.channelId === channelId && (beforeId === undefined || m.id < beforeId))
    .slice(-limit);
}

export async function sendMessage(
  channelId: number,
  author: string,
  text: string,
): Promise<Message> {
  await delay();
  const message: Message = {
    id: db.messages.length + 1,
    channelId,
    author,
    text,
    createdAt: new Date().toISOString(),
  };
  db.messages.push(message);
  return message;
}
