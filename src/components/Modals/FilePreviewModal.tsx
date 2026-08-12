import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { FileEntry } from '../../utils/fileSystem';
import { X } from 'lucide-react';
import { FilePreviewPane } from '../FilePreviewPane';
import { Tooltip } from '../Tooltip';

export const FilePreviewModal = ({ fileEntry, name, onClose }: { fileEntry?: FileEntry, name: string, onClose: () => void }) => {
  const { t } = useLanguage();
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const handleClose = () => {
    dialogRef.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleClose}
      className="p-0 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-border-lite backdrop:bg-black/80 backdrop:backdrop-blur-sm m-auto animate-in zoom-in-95 duration-200 bg-surface-card"
    >
      <div className="flex justify-between items-center p-4 border-b border-border-lite bg-surface-base rounded-t-2xl shrink-0">
        <span className="font-bold text-lg text-text-primary truncate pr-4">{name.startsWith("cat_") ? t(name as any) : name}</span>
        <Tooltip content={t('close')}>
          <button onClick={handleClose} aria-label={t('close')} className="text-text-secondary hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10 focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-hidden relative min-h-[50vh] rounded-b-2xl">
        <FilePreviewPane fileEntry={fileEntry} name={name} className="w-full h-full min-h-[50vh]" />
      </div>
    </dialog>
  );
};
