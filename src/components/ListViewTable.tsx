import React, { useState, useMemo } from 'react';
import { Search, X, ArrowUpDown } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { FileEntry } from '../utils/fileSystem';
import { PreviewTooltip } from './PreviewTooltip';
import { renderIcon, COLOR_VARIANTS } from '../utils/theme';

export const ListViewTable = ({ containers, scannedFiles }: { containers: { id: string, name: string, color?: string, icon?: string, files: string[] }[], scannedFiles: FileEntry[] }) => {
  const { t } = useLanguage();
  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'container' | 'extension' | 'date', direction: 'asc' | 'desc' } | null>(null);
  const [listSearchTerm, setListSearchTerm] = useState('');

  const flatFiles = useMemo(() => {
    const list: { path: string, name: string, container: string, color?: string, icon?: string, extension: string, lastModified: number, fileEntry?: FileEntry }[] = [];
    containers.forEach(c => {
      c.files.forEach(fPath => {
        const entry = scannedFiles.find(sf => sf.path === fPath);
        const nameParts = fPath.split('/');
        const name = nameParts[nameParts.length - 1];
        list.push({
          path: fPath,
          name: name,
          container: c.name,
          color: c.color,
          icon: c.icon,
          extension: entry?.extension || '',
          lastModified: entry?.lastModified || 0,
          fileEntry: entry
        });
      });
    });
    return list;
  }, [containers, scannedFiles]);

  const filteredFiles = useMemo(() => {
    let result = flatFiles;
    if (listSearchTerm.trim()) {
      const term = listSearchTerm.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(term) ||
        f.container.toLowerCase().includes(term) ||
        f.extension.toLowerCase().includes(term)
      );
    }
    return result;
  }, [flatFiles, listSearchTerm]);

  const sortedFiles = useMemo(() => {
    let sortableItems = [...filteredFiles];
    if (sortConfig !== null) {
      const key = sortConfig.key === 'date' ? 'lastModified' : sortConfig.key;
      sortableItems.sort((a, b) => {
        if (a[key] < b[key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[key] > b[key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredFiles, sortConfig]);

  const requestSort = (key: 'name' | 'container' | 'extension' | 'date') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full h-full bg-surface-card rounded-2xl shadow-sm border border-border-lite overflow-hidden flex flex-col">
      <div className="p-3 border-b border-border-lite bg-surface-base flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder={t("filter_table")}
            value={listSearchTerm}
            onChange={(e) => setListSearchTerm(e.target.value)}
            className="w-full bg-surface-card border border-border-lite pl-9 pr-8 py-1.5 rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label={t("filter_table_aria")}
          />
          {listSearchTerm && (
            <button 
              onClick={() => setListSearchTerm('')} 
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              aria-label={t("clear_filter")}
              title={t("clear_filter")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-lite bg-surface-base sticky top-0 z-10">
              <th className="p-3 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('name')}>
                <div className="flex items-center gap-1">Archivo <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-3 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('container')}>
                <div className="flex items-center gap-1">Contenedor <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-3 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('extension')}>
                <div className="flex items-center gap-1">Tipo <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="p-3 text-xs font-semibold text-text-secondary cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => requestSort('date')}>
                <div className="flex items-center gap-1">Modificado <ArrowUpDown className="w-3 h-3" /></div>
              </th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {sortedFiles.map((f, i) => (
              <tr key={i} className="border-b border-border-lite hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                <td className="p-3 font-medium text-text-primary relative">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px] md:max-w-xs">{f.name}</span>
                  </div>
                  <PreviewTooltip file={f} />
                </td>
                <td className="p-3 text-text-secondary">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${(f.color && COLOR_VARIANTS[f.color]) ? COLOR_VARIANTS[f.color].border : 'border-indigo-200'} ${(f.color && COLOR_VARIANTS[f.color]) ? COLOR_VARIANTS[f.color].lightBg : 'bg-indigo-50'} ${(f.color && COLOR_VARIANTS[f.color]) ? COLOR_VARIANTS[f.color].darkText : 'text-indigo-700'} dark:bg-opacity-20`}>
                    {renderIcon(f.icon, f.color, 'w-3 h-3')}
                    {f.container}
                  </span>
                </td>
                <td className="p-3 text-text-secondary uppercase text-xs">{f.extension || 'Desc'}</td>
                <td className="p-3 text-text-secondary text-xs">
                  {f.lastModified ? new Date(f.lastModified).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            ))}
            {sortedFiles.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-text-secondary">
                  No hay archivos para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
