import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  AppWindow,
  Binary,
  Terminal,
  Package,
  Database,
  Globe,
  Key,
  BookOpen,
  Presentation,
} from 'lucide-react';

export type FileTypeVisual = {
  Icon: LucideIcon;
  /** Tailwind text color class */
  colorClass: string;
  /** Soft background for the icon plate */
  plateClass: string;
};

const EXEC = new Set(['exe', 'msi', 'bat', 'cmd', 'com', 'app', 'apk', 'bin', 'dmg', 'pkg']);
const ARCHIVE = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz']);
const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'psd', 'ai', 'ico', 'icns', 'bmp', 'heic']);
const VIDEO = new Set(['mp4', 'webm', 'avi', 'mkv', 'mov', 'm4v', 'wmv', 'flv']);
const AUDIO = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'aiff']);
const CODE = new Set([
  'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'py', 'java', 'cpp', 'c', 'h',
  'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'vue', 'svelte', 'sh',
]);
const DOC = new Set(['pdf', 'doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'pages']);
const SHEET = new Set(['xls', 'xlsx', 'csv', 'ods', 'numbers']);
const SLIDE = new Set(['ppt', 'pptx', 'key', 'odp']);
const DATA = new Set(['json', 'xml', 'yaml', 'yml', 'toml', 'sql', 'db', 'sqlite']);
const WEB = new Set(['url', 'webloc', 'htm']);
const KEY_EXTS = new Set(['pem', 'key', 'crt', 'cer', 'p12', 'pfx']);

/**
 * Characteristic Lucide icon + color for a file extension.
 * Used when there is no content preview and no OS/file-native icon.
 */
export function getFileTypeVisual(extension?: string): FileTypeVisual {
  const ext = (extension || '').toLowerCase();

  if (EXEC.has(ext) || ext === 'sh') {
    if (ext === 'sh' || ext === 'bat' || ext === 'cmd') {
      return { Icon: Terminal, colorClass: 'text-emerald-600 dark:text-emerald-400', plateClass: 'bg-emerald-50 dark:bg-emerald-950/40' };
    }
    return { Icon: AppWindow, colorClass: 'text-violet-600 dark:text-violet-400', plateClass: 'bg-violet-50 dark:bg-violet-950/40' };
  }
  if (ARCHIVE.has(ext)) {
    return { Icon: FileArchive, colorClass: 'text-amber-600 dark:text-amber-400', plateClass: 'bg-amber-50 dark:bg-amber-950/40' };
  }
  if (IMAGE.has(ext)) {
    return { Icon: FileImage, colorClass: 'text-pink-600 dark:text-pink-400', plateClass: 'bg-pink-50 dark:bg-pink-950/40' };
  }
  if (VIDEO.has(ext)) {
    return { Icon: FileVideo, colorClass: 'text-rose-600 dark:text-rose-400', plateClass: 'bg-rose-50 dark:bg-rose-950/40' };
  }
  if (AUDIO.has(ext)) {
    return { Icon: FileAudio, colorClass: 'text-fuchsia-600 dark:text-fuchsia-400', plateClass: 'bg-fuchsia-50 dark:bg-fuchsia-950/40' };
  }
  if (CODE.has(ext)) {
    return { Icon: FileCode, colorClass: 'text-sky-600 dark:text-sky-400', plateClass: 'bg-sky-50 dark:bg-sky-950/40' };
  }
  if (SHEET.has(ext)) {
    return { Icon: FileSpreadsheet, colorClass: 'text-green-600 dark:text-green-400', plateClass: 'bg-green-50 dark:bg-green-950/40' };
  }
  if (SLIDE.has(ext)) {
    return { Icon: Presentation, colorClass: 'text-orange-600 dark:text-orange-400', plateClass: 'bg-orange-50 dark:bg-orange-950/40' };
  }
  if (DOC.has(ext)) {
    return { Icon: ext === 'pdf' ? BookOpen : FileText, colorClass: 'text-blue-600 dark:text-blue-400', plateClass: 'bg-blue-50 dark:bg-blue-950/40' };
  }
  if (DATA.has(ext)) {
    return { Icon: Database, colorClass: 'text-cyan-600 dark:text-cyan-400', plateClass: 'bg-cyan-50 dark:bg-cyan-950/40' };
  }
  if (WEB.has(ext)) {
    return { Icon: Globe, colorClass: 'text-indigo-600 dark:text-indigo-400', plateClass: 'bg-indigo-50 dark:bg-indigo-950/40' };
  }
  if (KEY_EXTS.has(ext)) {
    return { Icon: Key, colorClass: 'text-yellow-600 dark:text-yellow-400', plateClass: 'bg-yellow-50 dark:bg-yellow-950/40' };
  }
  if (ext === 'iso' || ext === 'img') {
    return { Icon: Package, colorClass: 'text-slate-600 dark:text-slate-300', plateClass: 'bg-slate-100 dark:bg-slate-800/60' };
  }
  if (ext === 'dll' || ext === 'so' || ext === 'dylib') {
    return { Icon: Binary, colorClass: 'text-zinc-600 dark:text-zinc-300', plateClass: 'bg-zinc-100 dark:bg-zinc-800/60' };
  }

  return { Icon: File, colorClass: 'text-text-secondary', plateClass: 'bg-surface-card' };
}

export function FileTypeIconPlate({
  extension,
  className = '',
  iconClassName = 'w-24 h-24',
}: {
  extension?: string;
  className?: string;
  iconClassName?: string;
}) {
  const { Icon, colorClass, plateClass } = getFileTypeVisual(extension);
  return (
    <div
      className={`flex items-center justify-center rounded-3xl border border-border-lite shadow-sm ${plateClass} ${className}`}
      aria-hidden
    >
      <Icon className={`${iconClassName} ${colorClass}`} strokeWidth={1.25} />
    </div>
  );
}
