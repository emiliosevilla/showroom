import type { ActionDefinition, ActionGroupId, ActionId } from './types';
import { isActionAvailable, runBrowserAction } from './browserBridge';
import type { ActionContext, ActionResult } from './types';

export const ACTION_CATALOG: ActionDefinition[] = [
  { id: 'open', group: 'open' },
  { id: 'openInTab', group: 'open' },
  { id: 'openWith', group: 'open', requiresNative: true },
  { id: 'revealInFolder', group: 'open', requiresNative: true },
  { id: 'download', group: 'share' },
  { id: 'share', group: 'share' },
  { id: 'copyPath', group: 'share' },
  { id: 'prepareToSend', group: 'share' },
  { id: 'favorite', group: 'organize' },
  { id: 'moveToContainer', group: 'organize' },
];

const HABIT_KEY = 'showroom-action-habits';
const GROUP_ORDER_KEY = 'showroom-action-group-order';
const DEFAULT_GROUP_ORDER: ActionGroupId[] = ['open', 'organize', 'share'];

type HabitMap = Record<string, number>;

function readHabits(): HabitMap {
  try {
    return JSON.parse(localStorage.getItem(HABIT_KEY) || '{}');
  } catch {
    return {};
  }
}

export function recordActionHabit(extension: string, actionId: ActionId) {
  const habits = readHabits();
  const key = `${(extension || '_none').toLowerCase()}::${actionId}`;
  habits[key] = (habits[key] || 0) + 1;
  localStorage.setItem(HABIT_KEY, JSON.stringify(habits));
}

export function getFrequentActions(extension: string, limit = 3): ActionId[] {
  const habits = readHabits();
  const prefix = `${(extension || '_none').toLowerCase()}::`;
  return Object.entries(habits)
    .filter(([k]) => k.startsWith(prefix))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k.slice(prefix.length) as ActionId);
}

export function getGroupOrder(): ActionGroupId[] {
  try {
    const raw = localStorage.getItem(GROUP_ORDER_KEY);
    if (!raw) return DEFAULT_GROUP_ORDER;
    const parsed = JSON.parse(raw) as ActionGroupId[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_GROUP_ORDER;
    return parsed;
  } catch {
    return DEFAULT_GROUP_ORDER;
  }
}

export function getSuggestedActions(extension?: string): ActionId[] {
  const ext = (extension || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return ['open', 'download', 'share'];
  }
  if (ext === 'pdf') return ['openInTab', 'download', 'copyPath'];
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return ['download', 'copyPath', 'revealInFolder'];
  }
  if (['mp4', 'webm', 'mp3', 'wav'].includes(ext)) {
    return ['open', 'download', 'share'];
  }
  if (['txt', 'md', 'json', 'csv', 'js', 'ts', 'html', 'css', 'py'].includes(ext)) {
    return ['openInTab', 'copyPath', 'download'];
  }
  return ['open', 'download', 'copyPath'];
}

export function canRunAction(def: ActionDefinition): boolean {
  if (def.requiresNative && !isActionAvailable(def.id)) return false;
  if (!def.requiresNative && !isActionAvailable(def.id)) return false;
  return true;
}

export async function executeAction(
  actionId: ActionId,
  ctx: ActionContext
): Promise<ActionResult> {
  const result = await runBrowserAction(actionId, ctx);
  if (result.ok) {
    recordActionHabit(ctx.entry.extension || '', actionId);
  }
  return result;
}

export { isActionAvailable };
