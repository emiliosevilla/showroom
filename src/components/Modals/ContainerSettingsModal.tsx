import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, Type } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { COLOR_VARIANTS, AVAILABLE_COLORS, AVAILABLE_ICONS } from '../../utils/theme';

export const ContainerSettingsModal = ({
  container,
  existingNames,
  onClose,
  onSave
}: {
  container: { id: string, name: string, color?: string, icon?: string },
  existingNames: string[],
  onClose: () => void,
  onSave: (updates: { name: string, color?: string, icon?: string }) => void
}) => {
  const { t } = useLanguage();
  
  const [name, setName] = useState(container.name);
  const [color, setColor] = useState(container.color);
  const [icon, setIcon] = useState(container.icon);
  const [error, setError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    // Show modal automatically on mount
    dialogRef.current?.showModal();
  }, []);

  const handleClose = () => {
    dialogRef.current?.close();
    onClose();
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("name_empty") || "El nombre no puede estar vacío");
      return;
    }
    
    // Check for invalid characters (allow alphanumeric, spaces, dashes, underscores)
    if (!/^[a-zA-Z0-9_\-\s]+$/.test(trimmed)) {
      setError(t("name_invalid") || "Contiene caracteres inválidos");
      return;
    }
    
    if (trimmed.toLowerCase() !== container.name.toLowerCase() && existingNames.includes(trimmed.toLowerCase())) {
      setError(t("name_exists") || "El nombre ya existe");
      return;
    }
    
    onSave({ name: trimmed, color, icon });
    handleClose();
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleClose}
      className="bg-surface-card border border-border-lite p-6 rounded-xl shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] backdrop:bg-black/50 backdrop:backdrop-blur-sm m-auto animate-in zoom-in-95 duration-200"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {t("container_appearance") || "Apariencia del Contenedor"}
        </h3>
        <button onClick={handleClose} aria-label="Cerrar" className="p-1 rounded-md text-text-secondary hover:bg-surface-pill transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-4 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm flex items-center gap-2 border border-red-200">
            <X className="w-4 h-4" />
            {error}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-bold text-text-secondary flex items-center gap-2"><Type className="w-4 h-4"/> {t("container_name") || "Nombre del Contenedor"}</label>
          <input
            type="text"
            aria-label={t("container_name")}
            className="w-full bg-surface-base border border-border-lite rounded-lg px-3 py-2 text-text-primary focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-text-secondary">{t("color")}</label>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setColor(undefined)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform ${!color ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-110'}`}
              title={t("default")}
            >
              <div className="w-full h-full rounded-full bg-surface-pill border border-border-lite flex items-center justify-center">
                <X className="w-4 h-4 text-text-secondary" />
              </div>
            </button>
            {AVAILABLE_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${COLOR_VARIANTS[c].bg} ${color === c ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-surface-card scale-110 border-white' : 'border-black/10 dark:border-white/10 hover:scale-110'}`}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-bold text-text-secondary">{t("icon")}</label>
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            <button
              onClick={() => setIcon(undefined)}
              className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-colors ${!icon ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-border-lite bg-surface-base hover:border-indigo-300 text-text-primary'}`}
              title="Ninguno"
            >
              <X className="w-5 h-5" />
            </button>
            {Object.entries(AVAILABLE_ICONS).map(([iconName, IconComponent]) => (
              <button
                key={iconName}
                onClick={() => setIcon(iconName)}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center transition-colors ${icon === iconName ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500' : 'border-border-lite bg-surface-base hover:border-indigo-300 text-text-primary'}`}
                title={iconName}
              >
                <IconComponent className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border-lite mt-auto">
        <button
          onClick={handleClose}
          className="px-4 py-2 rounded-lg font-medium text-text-secondary hover:bg-surface-pill transition-colors"
        >
          {t("cancel") || "Cancelar"}
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
        >
          {t("save_changes") || "Guardar Cambios"}
        </button>
      </div>
    </dialog>
  );
};
