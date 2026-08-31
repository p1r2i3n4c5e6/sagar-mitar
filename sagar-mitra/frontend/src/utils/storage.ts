/** LocalStorage helpers for offline session persistence */
import type { AppSession, FriendEntry } from '../types';

const SESSION_KEY = 'sagar_session';
const FRIENDS_KEY = 'sagar_friends';

export function saveSession(session: AppSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): AppSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as AppSession) : null;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function saveFriends(friends: FriendEntry[]): void {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
}

export function loadFriends(): FriendEntry[] {
  const raw = localStorage.getItem(FRIENDS_KEY);
  return raw ? (JSON.parse(raw) as FriendEntry[]) : [];
}
