
import { db } from '@/db/localDb';

// Prototype API - local database, no backend yet.

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface KickVote {
  targetId: number;
  voterIds: number[];
}

export interface Channel {
  id: number;
  name: string;
  description: string;
  private: boolean;
  invited: boolean;
  ownerId: number;
  memberIds: number[];
  invitedUserIds: number[];
  bannedUserIds: number[];
  kickVotes: KickVote[];
  createdAt: string;
  lastActivityAt: string;
}

export interface Message {
  id: number;
  channelId: number;
  author: string;
  text: string;
  createdAt: string;
}

export interface Member {
  id: number;
  username: string;
  isOwner: boolean;
}

export interface ActionResult {
  message: string;
}

const delay = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 150));

const norm = (name: string) =>
  name.trim().replace(/^#/, '').toLowerCase();

const getUser = (id: number) => {
  const user = db.users.find((u) => u.id === id);
  if (!user) throw new Error('User not found. Please log in.');
  return user;
};

const getByNickname = (nickname: string) => {
  const user = db.users.find(
    (u) =>
      u.username.toLowerCase() ===
      nickname.trim().replace(/^@/, '').toLowerCase(),
  );
  if (!user) throw new Error(`User ${nickname} does not exist.`);
  return user;
};

const getChannel = (id: number) => {
  const channel = db.channels.find((c) => c.id === id);
  if (!channel) throw new Error('Channel no longer exists.');
  return channel;
};

const requireMember = (channel: Channel, userId: number) => {
  if (!channel.memberIds.includes(userId)) {
    throw new Error('You are not a member of this channel.');
  }
};

const requireOwner = (channel: Channel, userId: number) => {
  requireMember(channel, userId);
  if (channel.ownerId !== userId) {
    throw new Error('Only the channel owner can do this.');
  }
};

const snapshot = (channel: Channel): Channel => ({
  ...channel,
  memberIds: [...channel.memberIds],
  invitedUserIds: [...channel.invitedUserIds],
  bannedUserIds: [...channel.bannedUserIds],
  kickVotes: channel.kickVotes.map((vote) => ({
    targetId: vote.targetId,
    voterIds: [...vote.voterIds],
  })),
});

// Delete channels inactive for more than 30 days.
function clearInactiveChannels() {
  const limit = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (let index = db.channels.length - 1; index >= 0; index--) {
    const channel = db.channels[index];

    if (
      channel &&
      new Date(channel.lastActivityAt).getTime() < limit
    ) {
      db.channels.splice(index, 1);
    }
  }
}

// Authentication

export async function login(
  email: string,
  password: string,
): Promise<User> {
  await delay();

  const found = db.users.find(
    (u) =>
      u.email === email.trim().toLowerCase() &&
      u.password === password,
  );

  if (!found) throw new Error('Invalid email or password');

  return {
    id: found.id,
    username: found.username,
    email: found.email,
  };
}

export async function register(
  username: string,
  email: string,
  password: string,
): Promise<User> {
  await delay();

  const newUser = {
    id: Math.max(0, ...db.users.map((u) => u.id)) + 1,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
  };

  if (db.users.some((u) => u.email === newUser.email)) {
    throw new Error('An account with this email already exists');
  }

  if (
    db.users.some(
      (u) =>
        u.username.toLowerCase() ===
        newUser.username.toLowerCase(),
    )
  ) {
    throw new Error('This username is already taken');
  }

  db.users.push(newUser);

  return {
    id: newUser.id,
    username: newUser.username,
    email: newUser.email,
  };
}

// Channel listing

export async function getChannels(
  userId: number,
): Promise<Channel[]> {
  await delay();
  getUser(userId);
  clearInactiveChannels();

  return db.channels
    .filter((c) => c.memberIds.includes(userId))
    .sort(
      (a, b) =>
        Number(b.invitedUserIds.includes(userId)) -
        Number(a.invitedUserIds.includes(userId)),
    )
    .map(snapshot);
}

export async function openChannel(
  channelId: number,
  userId: number,
): Promise<void> {
  await delay();

  const channel = getChannel(channelId);
  requireMember(channel, userId);

  channel.invitedUserIds =
    channel.invitedUserIds.filter((id) => id !== userId);
}

export async function getChannelMembers(
  channelId: number,
  userId: number,
): Promise<Member[]> {
  await delay();

  const channel = getChannel(channelId);
  requireMember(channel, userId);

  return channel.memberIds.map((id) => {
    const user = getUser(id);

    return {
      id: user.id,
      username: user.username,
      isOwner: id === channel.ownerId,
    };
  });
}

export async function getPublicChannels(
  userId: number,
): Promise<Channel[]> {
  await delay();
  clearInactiveChannels();

  return db.channels
    .filter(
      (c) =>
        !c.private &&
        !c.memberIds.includes(userId) &&
        !c.bannedUserIds.includes(userId),
    )
    .map(snapshot);
}

// Messages and history

export async function getMessages(
  channelId: number,
  beforeId?: number,
  limit = 20,
): Promise<Message[]> {
  await delay();

  return db.messages
    .filter(
      (m) =>
        m.channelId === channelId &&
        (beforeId === undefined || m.id < beforeId),
    )
    .slice(-limit);
}

export async function sendMessage(
  channelId: number,
  author: string,
  text: string,
): Promise<Message> {
  await delay();

  const channel = getChannel(channelId);
  const sender = getByNickname(author);

  requireMember(channel, sender.id);

  const message: Message = {
    id: Math.max(0, ...db.messages.map((m) => m.id)) + 1,
    channelId,
    author: sender.username,
    text,
    createdAt: new Date().toISOString(),
  };

  db.messages.push(message);
  channel.lastActivityAt = message.createdAt;

  return message;
}

// Channel creation

export async function createChannel(
  name: string,
  description: string,
  isPrivate: boolean,
  ownerId: number,
): Promise<Channel> {
  await delay();

  getUser(ownerId);
  clearInactiveChannels();

  const channelName = name.trim().replace(/^#/, '');

  if (!/^[a-zA-Z0-9_-]{2,30}$/.test(channelName)) {
    throw new Error(
      'Channel name must contain 2–30 letters, numbers, _ or -',
    );
  }

  if (
    db.channels.some(
      (c) => norm(c.name) === norm(channelName),
    )
  ) {
    throw new Error(
      'Channel already exists. Use /join to enter a public channel.',
    );
  }

  const now = new Date().toISOString();

  const channel: Channel = {
    id: Math.max(0, ...db.channels.map((c) => c.id)) + 1,
    name: channelName,
    description: description.trim(),
    private: isPrivate,
    invited: false,
    ownerId,
    memberIds: [ownerId],
    invitedUserIds: [],
    bannedUserIds: [],
    kickVotes: [],
    createdAt: now,
    lastActivityAt: now,
  };

  db.channels.push(channel);
  return snapshot(channel);
}

// /join channelName [private]

export async function joinChannel(
  name: string,
  userId: number,
  isPrivate: boolean,
): Promise<ActionResult> {
  await delay();

  getUser(userId);
  clearInactiveChannels();

  const nameKey = norm(name);

  if (!/^[a-z0-9_-]{2,30}$/.test(nameKey)) {
    throw new Error(
      'Usage: /join channelName [private] (2–30 characters).',
    );
  }

  const existing = db.channels.find(
    (c) => norm(c.name) === nameKey,
  );

  if (!existing) {
    const created = await createChannel(
      name,
      '',
      isPrivate,
      userId,
    );

    return {
      message: `Channel #${created.name} created (${isPrivate ? 'private' : 'public'}).`,
    };
  }

  if (existing.memberIds.includes(userId)) {
    return {
      message: `You are already a member of #${existing.name}.`,
    };
  }

  if (existing.bannedUserIds.includes(userId)) {
    throw new Error('You are banned from this channel.');
  }

  if (existing.private) {
    throw new Error(
      'Private channel: ask the owner for an invitation.',
    );
  }

  if (isPrivate) {
    throw new Error(
      'This channel already exists as a public channel.',
    );
  }

  existing.memberIds.push(userId);

  return {
    message: `You joined #${existing.name}.`,
  };
}

// /invite nickName

export async function inviteUser(
  channelId: number,
  actorId: number,
  nickname: string,
): Promise<ActionResult> {
  await delay();

  const channel = getChannel(channelId);
  requireMember(channel, actorId);

  if (channel.private) requireOwner(channel, actorId);

  const invited = getByNickname(nickname);

  if (invited.id === actorId) {
    throw new Error('You cannot invite yourself.');
  }

  if (channel.bannedUserIds.includes(invited.id)) {
    if (channel.ownerId !== actorId) {
      throw new Error(
        'Only the owner can lift a channel ban.',
      );
    }

    channel.bannedUserIds =
      channel.bannedUserIds.filter(
        (id) => id !== invited.id,
      );

    channel.kickVotes =
      channel.kickVotes.filter(
        (vote) => vote.targetId !== invited.id,
      );
  }

  if (channel.memberIds.includes(invited.id)) {
    throw new Error(
      `${invited.username} is already a member.`,
    );
  }

  channel.memberIds.push(invited.id);

  if (!channel.invitedUserIds.includes(invited.id)) {
    channel.invitedUserIds.push(invited.id);
  }

  return {
    message: `${invited.username} invited to #${channel.name}. Their channel will show NEW.`,
  };
}

// /revoke nickName

export async function revokeUser(
  channelId: number,
  actorId: number,
  nickname: string,
): Promise<ActionResult> {
  await delay();

  const channel = getChannel(channelId);

  if (!channel.private) {
    throw new Error(
      '/revoke is only available in private channels.',
    );
  }

  requireOwner(channel, actorId);

  const target = getByNickname(nickname);

  if (target.id === actorId) {
    throw new Error(
      'Use /cancel if you want to close your own channel.',
    );
  }

  if (!channel.memberIds.includes(target.id)) {
    throw new Error(
      `${target.username} is not a member.`,
    );
  }

  channel.memberIds =
    channel.memberIds.filter(
      (id) => id !== target.id,
    );

  channel.invitedUserIds =
    channel.invitedUserIds.filter(
      (id) => id !== target.id,
    );

  return {
    message: `${target.username} removed from #${channel.name}.`,
  };
}

// /kick nickName

export async function kickUser(
  channelId: number,
  actorId: number,
  nickname: string,
): Promise<ActionResult> {
  await delay();

  const channel = getChannel(channelId);
  requireMember(channel, actorId);

  if (channel.private) {
    throw new Error('Use /revoke in private channels.');
  }

  const target = getByNickname(nickname);

  if (target.id === channel.ownerId) {
    throw new Error('The owner cannot be kicked.');
  }

  if (target.id === actorId) {
    throw new Error('Use /cancel to leave the channel.');
  }

  if (channel.bannedUserIds.includes(target.id)) {
    throw new Error(
      `${target.username} is already banned.`,
    );
  }

  let votes = channel.kickVotes.find(
    (vote) => vote.targetId === target.id,
  );

  if (votes?.voterIds.includes(actorId)) {
    throw new Error(
      'You have already used /kick against this user.',
    );
  }

  if (
    !channel.memberIds.includes(target.id) &&
    !votes
  ) {
    throw new Error(
      `${target.username} is not a member.`,
    );
  }

  // Channel owner can ban instantly.
  if (channel.ownerId === actorId) {
    channel.bannedUserIds.push(target.id);

    channel.kickVotes =
      channel.kickVotes.filter(
        (vote) => vote.targetId !== target.id,
      );

    channel.memberIds =
      channel.memberIds.filter(
        (id) => id !== target.id,
      );

    channel.invitedUserIds =
      channel.invitedUserIds.filter(
        (id) => id !== target.id,
      );

    return {
      message: `${target.username} permanently banned by the owner.`,
    };
  }

  // Other members vote.
  if (!votes) {
    votes = {
      targetId: target.id,
      voterIds: [],
    };

    channel.kickVotes.push(votes);
  }

  votes.voterIds.push(actorId);

  channel.memberIds =
    channel.memberIds.filter(
      (id) => id !== target.id,
    );

  channel.invitedUserIds =
    channel.invitedUserIds.filter(
      (id) => id !== target.id,
    );

  if (votes.voterIds.length >= 3) {
    channel.bannedUserIds.push(target.id);

    return {
      message: `${target.username} permanently banned (3 distinct /kick votes).`,
    };
  }

  return {
    message: `${target.username} kicked out (${votes.voterIds.length}/3 votes). They may rejoin until permanently banned.`,
  };
}

// /cancel - leave the channel

export async function leaveChannel(
  channelId: number,
  actorId: number,
): Promise<ActionResult> {
  await delay();

  const channel = getChannel(channelId);
  requireMember(channel, actorId);

  if (channel.ownerId === actorId) {
    db.channels.splice(
      db.channels.indexOf(channel),
      1,
    );

    return {
      message: `You were the owner; #${channel.name} has been deleted.`,
    };
  }

  channel.memberIds =
    channel.memberIds.filter(
      (id) => id !== actorId,
    );

  channel.invitedUserIds =
    channel.invitedUserIds.filter(
      (id) => id !== actorId,
    );

  return {
    message: `You left #${channel.name}.`,
  };
}

// /quit - owner closes the channel

export async function closeChannel(
  channelId: number,
  actorId: number,
): Promise<ActionResult> {
  await delay();

  const channel = getChannel(channelId);
  requireOwner(channel, actorId);

  db.channels.splice(
    db.channels.indexOf(channel),
    1,
  );

  return {
    message: `#${channel.name} was permanently closed.`,
  };
}
