import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { FileEntry } from '../utils/fileSystem';
import { FileActionMenu } from './FileActionMenu';
import type { ActionContext } from '../platform/types';

function formatBytes(n?: number): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(ms?: number, unavailableLabel?: string): string {
  if (!ms) return unavailableLabel || '—';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return '—';
  }
}

type Props = {
  entry: FileEntry | null;
  selectedPaths: string[];
  entriesByPath: Map<string, FileEntry>;
  containerId: string;
  app: ActionContext['app'];
  className?: string;
};

export function FilePropertiesPanel({
  entry,
  selectedPaths,
  entriesByPath,
  containerId,
  app,
  className = '',
}: Props) {
  const { t } = useLanguage();

  if (!entry) {
    return (
      <div className={`flex items-center justify-center text-sm text-text-secondary p-4 ${className}`}>
        {t('select_file_preview')}
      </div>
    );
  }

  const mime = entry.fileObject?.type || (entry.extension ? `.${entry.extension}` : t('unknown'));
  const na = t('not_available_browser');

  return (
    <div className={`flex flex-col min-h-0 overflow-hidden ${className}`}>
      <div className="shrink-0 px-3 py-2 border-b border-border-lite">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide mb-2">{t('file_properties')}</h4>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
          <dt className="text-text-secondary">{t('prop_type')}</dt>
          <dd className="text-text-primary truncate font-medium">{mime}</dd>
          <dt className="text-text-secondary">{t('prop_full_name')}</dt>
          <dd className="text-text-primary truncate font-mono" title={entry.name}>{entry.name}</dd>
          <dt className="text-text-secondary">{t('prop_full_path')}</dt>
          <dd className="text-text-primary truncate font-mono" title={entry.path}>{entry.path}</dd>
          <dt className="text-text-secondary">{t('prop_created')}</dt>
          <dd className="text-text-primary">{entry.createdAt ? formatDate(entry.createdAt) : na}</dd>
          <dt className="text-text-secondary">{t('prop_modified')}</dt>
          <dd className="text-text-primary">{formatDate(entry.lastModified, '—')}</dd>
          <dt className="text-text-secondary">{t('prop_size')}</dt>
          <dd className="text-text-primary">{formatBytes(entry.size)}</dd>
        </dl>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide mb-2">{t('file_actions')}</h4>
        <FileActionMenu
          entry={entry}
          selectedPaths={selectedPaths}
          entriesByPath={entriesByPath}
          containerId={containerId}
          app={app}
        />
      </div>
    </div>
  );
}
