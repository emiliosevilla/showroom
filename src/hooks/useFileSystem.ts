import { useState, useRef, Dispatch, SetStateAction } from 'react';
import { scanDirectory, FileEntry, processFileList } from '../utils/fileSystem';
import { classifyFiles, ClassificationResult } from '../services/classifier';
import { setKey } from '../utils/idb';
import { TranslationKey } from '../i18n/translations';
import { shouldUseFolderInputFallback } from '../utils/embedContext';

export type AppStep = 'input' | 'scanning' | 'classifying' | 'editor';

export interface SavedSession {
  folderName: string;
  dirHandle: any;
  classification: ClassificationResult;
  timestamp: number;
}

export interface UseFileSystemParams {
  t: (key: TranslationKey, ...args: (string | number)[]) => string;
  classifyFiles: typeof classifyFiles;
  setClassification: Dispatch<SetStateAction<ClassificationResult | null>>;
  setExpandedContainers: Dispatch<SetStateAction<Set<string>>>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
  savedSessions: SavedSession[];
  setSavedSessions: Dispatch<SetStateAction<SavedSession[]>>;
}

export interface UseFileSystemReturn {
  step: AppStep;
  folderName: string;
  dirHandle: any;
  scannedFiles: FileEntry[];
  setScannedFiles: Dispatch<SetStateAction<FileEntry[]>>;
  errorMsg: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  abortControllerRef: React.RefObject<AbortController | null>;
  handleSelectFolder: () => Promise<void>;
  handleFallbackSelectFolder: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleResumeSession: (session: SavedSession) => Promise<void>;
}

export function useFileSystem({
  t,
  classifyFiles: classifyFilesFn,
  setClassification,
  setExpandedContainers,
  setIsDirty,
  savedSessions,
  setSavedSessions,
}: UseFileSystemParams): UseFileSystemReturn {
  const [step, setStep] = useState<AppStep>('input');
  const [folderName, setFolderName] = useState('');
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [scannedFiles, setScannedFiles] = useState<FileEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFallbackSelectFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setStep('scanning');

    try {
      const { entries, rootName } = processFileList(e.target.files);
      setFolderName(rootName);
      setDirHandle(null);
      setScannedFiles(entries);

      if (entries.length === 0) {
        setErrorMsg(t('folder_empty'));
        setStep('input');
        return;
      }

      const cappedFiles = entries.slice(0, 2000);
      setStep('classifying');
      const result = await classifyFilesFn(cappedFiles);
      if (!result.containers.find((c) => c.id === 'trash')) {
        result.containers.push({ id: 'trash', name: t('trash'), files: [] });
      }
      setClassification(result);
      setExpandedContainers(new Set());
      setStep('editor');
      setIsDirty(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(t('error_processing'));
      setStep('input');
    }
  };

  const handleResumeSession = async (session: SavedSession) => {
    try {
      setStep('scanning');
      const handle = session.dirHandle;
      if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') {
        const permission = await handle.requestPermission({ mode: 'read' });
        if (permission !== 'granted') {
          throw new Error(t('permissions_denied'));
        }
      }
      setDirHandle(handle);
      setFolderName(session.folderName);

      abortControllerRef.current = new AbortController();
      let filesDesc: FileEntry[] = [];
      try {
        filesDesc = await scanDirectory(handle, '', abortControllerRef.current.signal);
      } catch (e: any) {
        if (e.message === 'LIMIT_EXCEEDED') {
          setErrorMsg(t('limit_exceeded_error'));
        } else if (e.message === 'AbortError') {
          setErrorMsg(t('scan_aborted'));
        } else {
          setErrorMsg(t('scan_error'));
        }
        setStep('input');
        return;
      }
      setScannedFiles(filesDesc);

      const currentPaths = new Set(filesDesc.map((f) => f.path));
      const savedPaths = new Set<string>();

      session.classification.containers.forEach((c) => {
        c.files.forEach((f) => savedPaths.add(f));
      });

      const newFiles = filesDesc.filter((f) => !savedPaths.has(f.path));

      let updatedContainers = session.classification.containers.map((c) => ({
        ...c,
        files: c.files.filter((f) => currentPaths.has(f)),
      }));

      if (newFiles.length > 0) {
        const newClassification = await classifyFilesFn(newFiles);
        newClassification.containers.forEach((nc) => {
          if (nc.files.length === 0) return;
          const existRegex = new RegExp(`^${nc.name}$`, 'i');
          const existing = updatedContainers.find((c) => existRegex.test(c.name));
          if (existing) {
            existing.files.push(...nc.files);
          } else {
            updatedContainers.push({
              ...nc,
              id: `merged-${Date.now()}-${nc.id}`,
            });
          }
        });
      }

      setClassification({
        ...session.classification,
        containers: updatedContainers,
      });

      setExpandedContainers(new Set());
      setStep('editor');
      setIsDirty(true);
    } catch (e) {
      console.error(e);
      setErrorMsg(
        `No se pudo restaurar la sesión para "${session.folderName}". Verifica permisos o que la carpeta siga existiendo.`
      );
      setStep('input');

      const updatedSessions = savedSessions.filter((s) => s.folderName !== session.folderName);
      setSavedSessions(updatedSessions);
      setKey('smartfolder_sessions', updatedSessions);
    }
  };

  const handleSelectFolder = async () => {
    setErrorMsg('');

    if (shouldUseFolderInputFallback()) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
      setDirHandle(handle);
      setFolderName(handle.name);
      setStep('scanning');

      abortControllerRef.current = new AbortController();
      let filesDesc: FileEntry[] = [];
      try {
        filesDesc = await scanDirectory(handle, '', abortControllerRef.current.signal);
      } catch (e: any) {
        if (e.message === 'LIMIT_EXCEEDED') {
          setErrorMsg(t('limit_exceeded_error'));
        } else if (e.message === 'AbortError') {
          setErrorMsg(t('scan_aborted'));
        } else {
          setErrorMsg(t('scan_error'));
        }
        setStep('input');
        return;
      }
      setScannedFiles(filesDesc);

      if (filesDesc.length === 0) {
        setErrorMsg(t('folder_empty'));
        setStep('input');
        return;
      }

      const cappedFiles = filesDesc.slice(0, 2000);

      setStep('classifying');

      const result = await classifyFilesFn(cappedFiles);
      if (!result.containers.find((c) => c.id === 'trash')) {
        result.containers.push({ id: 'trash', name: t('trash'), files: [] });
      }
      setClassification(result);
      setExpandedContainers(new Set());
      setStep('editor');
      setIsDirty(true);
    } catch (err: any) {
      console.error(err);
      if (err?.name === 'AbortError') {
        // User cancelled the picker — stay on the current step (e.g. editor).
        return;
      }
      setErrorMsg(t('error_accessing_folder'));
      setStep('input');
    }
  };

  return {
    step,
    folderName,
    dirHandle,
    scannedFiles,
    setScannedFiles,
    errorMsg,
    fileInputRef,
    abortControllerRef,
    handleSelectFolder,
    handleFallbackSelectFolder,
    handleResumeSession,
  };
}
