import React from 'react';
import { 
  Folder, FolderOpen, Image as ImageIcon, Video, Music, FileText, 
  Archive, Code, Briefcase, Camera, Book, File, Globe, Key, 
  Box, Heart, Zap, Shield, Database 
} from 'lucide-react';

export const COLOR_VARIANTS: Record<string, { bg: string, text: string, border: string, lightBg: string, darkText: string }> = {
  'slate': { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-200', lightBg: 'bg-slate-50', darkText: 'text-slate-700' },
  'gray': { bg: 'bg-zinc-500', text: 'text-zinc-500', border: 'border-zinc-200', lightBg: 'bg-zinc-50', darkText: 'text-zinc-700' },
  'blue': { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', lightBg: 'bg-blue-50', darkText: 'text-blue-700' },
  'sky': { bg: 'bg-sky-500', text: 'text-sky-500', border: 'border-sky-200', lightBg: 'bg-sky-50', darkText: 'text-sky-700' },
  'indigo': { bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', lightBg: 'bg-blue-50', darkText: 'text-blue-800' },
  'cyan': { bg: 'bg-cyan-500', text: 'text-cyan-500', border: 'border-cyan-200', lightBg: 'bg-cyan-50', darkText: 'text-cyan-700' },
  'red': { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-200', lightBg: 'bg-red-50', darkText: 'text-red-700' },
  'orange': { bg: 'bg-orange-500', text: 'text-orange-500', border: 'border-orange-200', lightBg: 'bg-orange-50', darkText: 'text-orange-700' },
  'amber': { bg: 'bg-amber-500', text: 'text-amber-500', border: 'border-amber-200', lightBg: 'bg-amber-50', darkText: 'text-amber-700' },
  'emerald': { bg: 'bg-emerald-500', text: 'text-emerald-500', border: 'border-emerald-200', lightBg: 'bg-emerald-50', darkText: 'text-emerald-700' },
  'violet': { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-200', lightBg: 'bg-blue-50', darkText: 'text-blue-700' },
  'pink': { bg: 'bg-slate-500', text: 'text-slate-500', border: 'border-slate-200', lightBg: 'bg-slate-50', darkText: 'text-slate-700' },
  'rose': { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-200', lightBg: 'bg-red-50', darkText: 'text-red-700' },
};

export const AVAILABLE_COLORS = Object.keys(COLOR_VARIANTS);

export const AVAILABLE_ICONS: Record<string, React.ElementType> = {
  Folder, FolderOpen, ImageIcon, Video, Music, FileText, 
  Archive, Code, Briefcase, Camera, Book, File, Globe, Key, Box, Heart, Zap, Shield, Database
};

export const renderIcon = (iconName: string | undefined, colorKey: string | undefined, className: string) => {
  const colorObj = (colorKey && COLOR_VARIANTS[colorKey]) ? COLOR_VARIANTS[colorKey] : COLOR_VARIANTS['indigo'];
  if (iconName && AVAILABLE_ICONS[iconName]) {
    const IconComponent = AVAILABLE_ICONS[iconName];
    return <IconComponent className={`${className} ${colorObj.text}`} />;
  }
  // Default fallback if no icon but has color
  if (colorKey && COLOR_VARIANTS[colorKey]) {
    return <span className={`rounded-full flex-shrink-0 ${colorObj.bg} ${className.includes('w-') ? className.match(/w-\d+/)?.[0] : 'w-2'} ${className.includes('h-') ? className.match(/h-\d+/)?.[0] : 'h-2'}`}></span>;
  }
  // Default to small dot if nothing specified
  return <span className={`rounded-full flex-shrink-0 bg-blue-500 ${className.includes('w-') ? className.match(/w-\d+/)?.[0] : 'w-2'} ${className.includes('h-') ? className.match(/h-\d+/)?.[0] : 'h-2'}`}></span>;
};
