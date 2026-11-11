const API_URL = 'http://localhost:3333/api/v1';

// Pouzivatel, ktoreho vracia AdonisJS
export interface BackendUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
  fullName: string | null;
  email: string;
}

// Odpoved pri prihlaseni a registracii
interface AuthResponse {
  data: {
    user: BackendUser;
    token: string;
  };
}

// Udaje registracneho formulara
export interface RegisterData {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

// Spolocna funkcia pre komunikaciu s backendom
async function apiRequest<T>(
  path: string,
  method: 'GET' | 'POST',
  body?: unknown,
  token?: string,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const result: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = result as {
      message?: string;
      errors?: { message: string }[];
    } | null;

    throw new Error(
      error?.errors?.[0]?.message ?? error?.message ?? `API error: ${response.status}`,
    );
  }

  return result as T;
}

// Registracia cez PostgreSQL
export async function registerBackend(data: RegisterData) {
  const response = await apiRequest<AuthResponse>('/auth/signup', 'POST', data);

  return response.data;
}

// Prihlasenie cez PostgreSQL
export async function loginBackend(email: string, password: string) {
  const response = await apiRequest<AuthResponse>('/auth/login', 'POST', { email, password });

  return response.data;
}

// Nacitanie profilu prihlaseneho pouzivatela
export async function getProfileBackend(token: string) {
  const response = await apiRequest<{ data: BackendUser }>(
    '/account/profile',
    'GET',
    undefined,
    token,
  );

  return response.data;
}

// Odhlasenie - zneplatnenie tokenu
export async function logoutBackend(token: string) {
  await apiRequest('/account/logout', 'POST', undefined, token);
}
