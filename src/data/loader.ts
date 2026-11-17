import type { History, Meta, Players, Role } from './types';
export async function loadJSON<T>(file: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
  if (!response.ok) throw new Error(`Could not load ${file}`);
  return response.json() as Promise<T>;
}
export async function loadCore(): Promise<{ meta: Meta; players: Players }> {
  const [meta, players] = await Promise.all([
    loadJSON<Meta>('meta.json'),
    loadJSON<Players>('players.json'),
  ]);
  if (!meta.population || !Array.isArray(players.records) || !Array.isArray(players.identities))
    throw new Error('Invalid dashboard data');
  return { meta, players };
}
const historyCache = new Map<Role, Promise<History>>();
export function loadHistory(role: Role): Promise<History> {
  if (!historyCache.has(role))
    historyCache.set(
      role,
      loadJSON<History>(`history.${role}.json`).catch((error) => {
        historyCache.delete(role);
        throw error;
      }),
    );
  return historyCache.get(role)!;
}
