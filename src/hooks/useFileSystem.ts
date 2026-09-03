import { useState, useRef, Dispatch, SetStateAction } from 'react';
import { scanDirectory, FileEntry, processFileList } from '../utils/fileSystem';
import { classifyFiles, ClassificationResult, ensureOthersContainer } from '../services/classifier';
import { setKey } from '../utils/idb';
import { TranslationKey } from '../i18n/translations';
import { shouldUseFolderInputFallback } from '../utils/embedContext';
import { getNativeBridge } from '../platform/types';

export type AppStep = 'input' | 'scanning' | 'classifying' | 'editor';

export interface SavedSession {
  folderName: string;
  /** Absolute path when opened via Electron native picker */
  workspacePath?: string;
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
  showToast?: (message: string) => void;
}

export interface UseFileSystemReturn {
  step: AppStep;
  folderName: string;
  dirHandle: any;
  workspacePath: string | null;
  scannedFiles: FileEntry[];
  setScannedFiles: Dispatch<SetStateAction<FileEntry[]>>;
  errorMsg: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  abortControllerRef: React.RefObject<AbortController | null>;
  handleSelectFolder: () => Promise<void>;
  handleFallbackSelectFolder: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleResumeSession: (session: SavedSession) => Promise<void>;
}

function sessionMatchKey(s: Pick<SavedSession, 'folderName' | 'workspacePath'>): string {
  return (s.workspacePath || s.folderName).toLowerCase();
}

function finalizeClassification(result: ClassificationResult): ClassificationResult {
  return ensureOthersContainer(result);
}

export function useFileSystem({
  t,
  classifyFiles: classifyFilesFn,
  setClassification,
  setExpandedContainers,
  setIsDirty,
  savedSessions,
  setSavedSessions,
  showToast,
}: UseFileSystemParams): UseFileSystemReturn {
  const [step, setStep] = useState<AppStep>('input');
  const [folderName, setFolderName] = useState('');
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [scannedFiles, setScannedFiles] = useState<FileEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const notifySkippedFolders = (skippedFolders: string[]) => {
    if (skippedFolders.length > 0) {
      showToast?.(t('folders_skipped_notice', skippedFolders.length));
    }
  };

  const enterEditor = (result: ClassificationResult) => {
    setClassification(finalizeClassification(result));
    setExpandedContainers(new Set());
    setStep('editor');
    setIsDirty(true);
  };

  const handleFallbackSelectFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setStep('scanning');

    try {
      const { entries, rootName } = processFileList(e.target.files);
      setFolderName(rootName);
      setDirHandle(null);
      setWorkspacePath(null);
      setScannedFiles(entries);

      if (entries.length === 0) {
        setErrorMsg(t('folder_empty'));
        setStep('input');
        return;
      }

      const cappedFiles = entries.slice(0, 2000);
      setStep('classifying');
      const result = await classifyFilesFn(cappedFiles);
      enterEditor(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(t('error_processing'));
      setStep('input');
    }
  };

  const mergeLiveWithSaved = async (
    filesDesc: FileEntry[],
    session: SavedSession
  ): Promise<ClassificationResult> => {
    const currentPaths = new Set(filesDesc.map((f) => f.path));
    const savedPaths = new Set<string>();
    session.classification.containers.forEach((c) => {
      c.files.forEach((f) => savedPaths.add(f));
    });

    const newFiles = filesDesc.filter((f) => !savedPaths.has(f.path));

    let updatedContainers = session.classification.containers
      .filter((c) => c.id !== 'trash')
      .map((c) => ({
        ...c,
        files: c.files.filter((f) => currentPaths.has(f)),
      }));

    if (newFiles.length > 0) {
      const newClassification = await classifyFilesFn(newFiles);
      newClassification.containers.forEach((nc) => {
        if (nc.files.length === 0) return;
        const existing = updatedContainers.find(
          (c) => c.id === nc.id || c.name.toLowerCase() === nc.name.toLowerCase()
        );
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

    return finalizeClassification({
      ...session.classification,
      containers: updatedContainers,
    });
  };

  const handleResumeSession = async (session: SavedSession) => {
    try {
      setStep('scanning');
      const native = getNativeBridge();

      if (session.workspacePath && native?.scanFolder) {
        native.setWorkspaceRoot?.(session.workspacePath);
        const { entries: scanned, skippedFolders } = await native.scanFolder(session.workspacePath);
        const filesDesc: FileEntry[] = scanned
          .filter((s) => s.kind === 'file')
          .map((s) => ({
            path: s.path,
            name: s.name,
            kind: 'file' as const,
            lastModified: s.lastModified,
            size: s.size,
            createdAt: s.createdAt,
            extension: s.extension || s.name.split('.').pop()?.toLowerCase() || '',
            absolutePath: s.absolutePath || s.path,
          }));
        setDirHandle(null);
        setWorkspacePath(session.workspacePath);
        setFolderName(session.folderName);
        setScannedFiles(filesDesc);
        if (filesDesc.length === 0) {
          setErrorMsg(t('folder_empty'));
          setStep('input');
          return;
        }
        notifySkippedFolders(skippedFolders);
        const merged = await mergeLiveWithSaved(filesDesc, session);
        setClassification(merged);
        setExpandedContainers(new Set());
        setStep('editor');
        setIsDirty(true);
        return;
      }

      const handle = session.dirHandle;
      if (!handle) {
        // Layout-only restore (no live handle after reload)
        setDirHandle(null);
        setWorkspacePath(session.workspacePath || null);
        setFolderName(session.folderName);
        setScannedFiles([]);
        setClassification(finalizeClassification(session.classification));
        setExpandedContainers(new Set());
        setStep('editor');
        setIsDirty(true);
        return;
      }

      if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') {
        const permission = await handle.requestPermission({ mode: 'read' });
        if (permission !== 'granted') {
          throw new Error(t('permissions_denied'));
        }
      }
      setDirHandle(handle);
      setWorkspacePath(null);
      setFolderName(session.folderName);

      abortControllerRef.current = new AbortController();
      let filesDesc: FileEntry[] = [];
      let skippedFolders: string[] = [];
      try {
        const scanResult = await scanDirectory(handle, '', abortControllerRef.current.signal);
        filesDesc = scanResult.entries;
        skippedFolders = scanResult.skippedFolders;
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
      notifySkippedFolders(skippedFolders);

      const merged = await mergeLiveWithSaved(filesDesc, session);
      setClassification(merged);
      setExpandedContainers(new Set());
      setStep('editor');
      setIsDirty(true);
    } catch (e) {
      console.error(e);
      setErrorMsg(
        `No se pudo restaurar la sesión para "${session.folderName}". Verifica permisos o que la carpeta siga existiendo.`
      );
      setStep('input');

      const updatedSessions = savedSessions.filter(
        (s) => sessionMatchKey(s) !== sessionMatchKey(session)
      );
      setSavedSessions(updatedSessions);
      setKey('smartfolder_sessions', updatedSessions);
    }
  };

  const handleSelectFolder = async () => {
    setErrorMsg('');

    const native = getNativeBridge();
    if (native?.pickFolder && native.scanFolder) {
      try {
        const picked = await native.pickFolder();
        if (!picked) return;
        setStep('scanning');
        native.setWorkspaceRoot?.(picked.path);
        const { entries: scanned, skippedFolders } = await native.scanFolder(picked.path);
        const filesDesc: FileEntry[] = scanned
          .filter((s) => s.kind === 'file')
          .map((s) => ({
            path: s.path,
            name: s.name,
            kind: 'file' as const,
            lastModified: s.lastModified,
            size: s.size,
            createdAt: s.createdAt,
            extension: s.extension || s.name.split('.').pop()?.toLowerCase() || '',
            absolutePath: s.absolutePath || s.path,
          }));
        setFolderName(picked.name);
        setDirHandle(null);
        setWorkspacePath(picked.path);
        setScannedFiles(filesDesc);
        if (filesDesc.length === 0) {
          setErrorMsg(t('folder_empty'));
          setStep('input');
          return;
        }
        notifySkippedFolders(skippedFolders);
        setStep('classifying');
        const result = await classifyFilesFn(filesDesc.slice(0, 2000));
        enterEditor(result);
        return;
      } catch (err: any) {
        console.error(err);
        // Electron wraps IPC errors as "Error invoking remote method '...': Error: LIMIT_EXCEEDED",
        // so the original message survives only as a substring, not an exact match.
        if (err?.message?.includes('LIMIT_EXCEEDED')) {
          setErrorMsg(t('limit_exceeded_error'));
        } else {
          setErrorMsg(t('error_accessing_folder'));
        }
        setStep('input');
        return;
      }
    }

    if (shouldUseFolderInputFallback()) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'read' });
      setDirHandle(handle);
      setWorkspacePath(null);
      setFolderName(handle.name);
      setStep('scanning');

      abortControllerRef.current = new AbortController();
      let filesDesc: FileEntry[] = [];
      let skippedFolders: string[] = [];
      try {
        const scanResult = await scanDirectory(handle, '', abortControllerRef.current.signal);
        filesDesc = scanResult.entries;
        skippedFolders = scanResult.skippedFolders;
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
      notifySkippedFolders(skippedFolders);

      const cappedFiles = filesDesc.slice(0, 2000);
      setStep('classifying');
      const result = await classifyFilesFn(cappedFiles);
      enterEditor(result);
    } catch (err: any) {
      console.error(err);
      if (err?.name === 'AbortError') {
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
    workspacePath,
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
