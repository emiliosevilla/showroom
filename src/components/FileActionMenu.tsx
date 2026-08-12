import React, { useMemo, useState } from 'react';
import {
  ExternalLink, Download, Share2, Copy, Star, Trash2, FolderOpen,
  Archive, Monitor, Send, Move, ChevronDown, ChevronRight, Lock
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { FileEntry } from '../utils/fileSystem';
import {
  ACTION_CATALOG,
  canRunAction,
  executeAction,
  getFrequentActions,
  getGroupOrder,
  getSuggestedActions,
} from '../platform/fileActions';
import type { ActionContext, ActionGroupId, ActionId } from '../platform/types';
import { Tooltip } from './Tooltip';

const ICONS: Partial<Record<ActionId, React.ReactNode>> = {
  open: <ExternalLink className="w-3.5 h-3.5" />,
  openInTab: <ExternalLink className="w-3.5 h-3.5" />,
  openWith: <Monitor className="w-3.5 h-3.5" />,
  revealInFolder: <FolderOpen className="w-3.5 h-3.5" />,
  download: <Download className="w-3.5 h-3.5" />,
  share: <Share2 className="w-3.5 h-3.5" />,
  copyPath: <Copy className="w-3.5 h-3.5" />,
  zipSelection: <Archive className="w-3.5 h-3.5" />,
  compress: <Archive className="w-3.5 h-3.5" />,
  prepareToSend: <Send className="w-3.5 h-3.5" />,
  favorite: <Star className="w-3.5 h-3.5" />,
  moveToContainer: <Move className="w-3.5 h-3.5" />,
  trash: <Trash2 className="w-3.5 h-3.5" />,
};

type Props = {
  entry: FileEntry;
  selectedPaths: string[];
  entriesByPath: Map<string, FileEntry>;
  containerId: string;
  app: ActionContext['app'];
};

function actionLabelKey(id: ActionId): string {
  return `action_${id}`;
}

function groupLabelKey(id: ActionGroupId): string {
  return `action_group_${id}`;
}

export function FileActionMenu({ entry, selectedPaths, entriesByPath, containerId, app }: Props) {
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const groupOrder = getGroupOrder();

  const suggested = useMemo(() => getSuggestedActions(entry.extension), [entry.extension]);
  const frequent = useMemo(() => getFrequentActions(entry.extension || ''), [entry.extension, entry.path]);

  const ctx: ActionContext = { entry, selectedPaths, entriesByPath, containerId, app };

  const run = async (id: ActionId) => {
    const def = ACTION_CATALOG.find(a => a.id === id);
    if (def && !canRunAction(def)) {
      app.showToast?.(t('action_requires_desktop'));
      return;
    }
    const result = await executeAction(id, ctx);
    if (result.message === 'path_copied') app.showToast?.(t('path_copied'));
    if (result.message === 'requires_desktop') app.showToast?.(t('action_requires_desktop'));
    if (result.message === 'use_drag_drop') app.showToast?.(t('action_use_drag_drop'));
    if (result.message === 'prepare_send_zipped') app.showToast?.(t('prepare_send_zipped'));
    if (result.message === 'prepare_send_downloaded') app.showToast?.(t('prepare_send_downloaded'));
  };

  const renderChip = (id: ActionId) => {
    const def = ACTION_CATALOG.find(a => a.id === id);
    if (!def) return null;
    const available = canRunAction(def);
    const label = t(actionLabelKey(id) as any);
    const tip = !available ? t('action_requires_desktop') : label;
    return (
      <Tooltip key={id} content={tip}>
        <button
          type="button"
          disabled={!available && def.requiresNative}
          onClick={() => run(id)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors
            ${available
              ? 'border-border-lite bg-surface-card hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-text-primary'
              : 'border-border-lite bg-surface-base text-text-secondary opacity-60 cursor-not-allowed'}`}
          aria-label={label}
        >
          {!available && def.requiresNative ? <Lock className="w-3 h-3" /> : ICONS[id]}
          {label}
        </button>
      </Tooltip>
    );
  };

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {frequent.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-text-secondary font-semibold mb-1.5">{t('action_frequent')}</p>
          <div className="flex flex-wrap gap-1.5">{frequent.map(renderChip)}</div>
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-wide text-text-secondary font-semibold mb-1.5">{t('action_suggested')}</p>
        <div className="flex flex-wrap gap-1.5">{suggested.map(renderChip)}</div>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar min-h-0">
        {groupOrder.map(groupId => {
          const items = ACTION_CATALOG.filter(a => a.group === groupId);
          const isCollapsed = collapsed[groupId];
          return (
            <div key={groupId} className="border border-border-lite rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-text-primary bg-surface-base hover:bg-surface-pill transition-colors"
                onClick={() => setCollapsed(c => ({ ...c, [groupId]: !c[groupId] }))}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {t(groupLabelKey(groupId) as any)}
              </button>
              {!isCollapsed && (
                <div className="flex flex-col p-1 bg-surface-card">
                  {items.map(def => {
                    const available = canRunAction(def);
                    const label = t(actionLabelKey(def.id) as any);
                    const tip = !available && def.requiresNative ? t('action_requires_desktop') : label;
                    return (
                      <Tooltip key={def.id} content={tip}>
                        <button
                          type="button"
                          disabled={!available && def.requiresNative}
                          onClick={() => run(def.id)}
                          className={`flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors
                            ${def.group === 'danger' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-text-primary hover:bg-surface-base'}
                            ${!available && def.requiresNative ? 'opacity-50 cursor-not-allowed' : ''}`}
                          aria-label={label}
                        >
                          <span className="opacity-70">{!available && def.requiresNative ? <Lock className="w-3.5 h-3.5" /> : ICONS[def.id]}</span>
                          <span className="flex-1 truncate">{label}</span>
                          {!available && def.requiresNative && (
                            <span className="text-[10px] text-text-secondary">{t('desktop_only')}</span>
                          )}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
