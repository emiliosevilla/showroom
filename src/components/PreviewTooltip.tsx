import React, { useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { getImagePreview } from '../exportHtml';

export const PreviewTooltip = ({ file }: { file: any }) => {
  const { t } = useLanguage();
  const isImage = file.extension && ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(file.extension.toLowerCase());
  const previewUrl = useMemo(() => {
    if (isImage && file.fileEntry?.fileObject) {
      return getImagePreview(file.fileEntry.fileObject);
    }
    return '';
  }, [file.fileEntry, isImage]);

  return (
    <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-surface-card border border-border-lite shadow-xl rounded-lg p-3 min-w-[200px] max-w-sm pointer-events-none fade-in">
      <div className="text-sm font-semibold text-text-primary mb-1 truncate">{file.name}</div>
      <div className="text-xs text-text-secondary mb-2 break-all line-clamp-2" title={file.path}>Ruta: {file.path}</div>
      <div className="text-xs text-text-secondary mb-2">Modificado: {file.lastModified ? new Date(file.lastModified).toLocaleString() : 'N/A'}</div>
      {previewUrl && (
        <img src={previewUrl} alt="Preview" className="w-full max-h-32 object-contain bg-surface-base rounded border border-border-lite" />
      )}
    </div>
  );
};
