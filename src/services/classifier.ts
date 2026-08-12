import { FileEntry } from '../utils/fileSystem';

export interface ClassificationResult {
  containers: {
    id: string;
    name: string;
    files: string[];
    color?: string;
    icon?: string;
  }[];
}

const EXTENSION_MAP: Record<string, string> = {
  'exe': 'cat_executables',
  'msi': 'cat_executables',
  'bat': 'cat_executables',
  'sh': 'cat_executables',
  'app': 'cat_executables',
  'apk': 'cat_executables',
  'bin': 'cat_executables',

  'png': 'cat_graphics',
  'jpg': 'cat_graphics',
  'jpeg': 'cat_graphics',
  'gif': 'cat_graphics',
  'svg': 'cat_graphics',
  'webp': 'cat_graphics',
  'psd': 'cat_graphics',
  'ai': 'cat_graphics',
  'ico': 'cat_graphics',

  'pdf': 'cat_docs',
  'doc': 'cat_docs',
  'docx': 'cat_docs',
  'txt': 'cat_docs',
  'md': 'cat_docs',
  'xls': 'cat_docs',
  'xlsx': 'cat_docs',
  'csv': 'cat_docs',

  'zip': 'cat_compressed',
  'rar': 'cat_compressed',
  '7z': 'cat_compressed',
  'tar': 'cat_compressed',
  'gz': 'cat_compressed',

  'mp3': 'cat_multimedia',
  'mp4': 'cat_multimedia',
  'wav': 'cat_multimedia',
  'avi': 'cat_multimedia',
  'mkv': 'cat_multimedia',
  'mov': 'cat_multimedia',

  'js': 'cat_code',
  'ts': 'cat_code',
  'html': 'cat_code',
  'css': 'cat_code',
  'json': 'cat_code',
  'py': 'cat_code',
  'java': 'cat_code',
  'cpp': 'cat_code',
  'c': 'cat_code',
  'tsx': 'cat_code',
  'jsx': 'cat_code',
};

/** Stable id for the catch-all "Others" container. */
export const OTHERS_CONTAINER_ID = 'otros';
export const OTHERS_CONTAINER_NAME = 'cat_misc';

export async function classifyFiles(files: FileEntry[]): Promise<ClassificationResult> {
  await new Promise(res => setTimeout(res, 500));

  const groups: Record<string, string[]> = {
    'cat_executables': [],
    'cat_graphics': [],
    'cat_docs': [],
    'cat_compressed': [],
    'cat_multimedia': [],
    'cat_code': [],
    [OTHERS_CONTAINER_NAME]: [],
  };

  for (const file of files) {
    // Directories are not classified into containers (no subfolders bucket).
    if (file.kind === 'directory') continue;

    const ext = file.extension?.toLowerCase() || '';
    const groupName = (ext && EXTENSION_MAP[ext]) || OTHERS_CONTAINER_NAME;
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(file.path);
  }

  const containers = Object.entries(groups)
    .filter(([name, groupFiles]) => groupFiles.length > 0 || name === OTHERS_CONTAINER_NAME)
    .map(([name, groupFiles], idx) => ({
      id: name === OTHERS_CONTAINER_NAME ? OTHERS_CONTAINER_ID : `cont_${idx}`,
      name,
      files: groupFiles,
    }));

  // Ensure Others is always last
  containers.sort((a, b) => {
    if (a.id === OTHERS_CONTAINER_ID) return 1;
    if (b.id === OTHERS_CONTAINER_ID) return -1;
    return 0;
  });

  return { containers };
}

/** Guarantee an Others container exists (empty allowed). */
export function ensureOthersContainer(
  result: ClassificationResult,
  othersLabel = OTHERS_CONTAINER_NAME
): ClassificationResult {
  if (result.containers.some(c => c.id === OTHERS_CONTAINER_ID || c.name === OTHERS_CONTAINER_NAME)) {
    return {
      containers: result.containers.map(c =>
        c.name === OTHERS_CONTAINER_NAME || c.id === OTHERS_CONTAINER_ID
          ? { ...c, id: OTHERS_CONTAINER_ID, name: othersLabel === OTHERS_CONTAINER_NAME ? OTHERS_CONTAINER_NAME : c.name }
          : c
      ),
    };
  }
  return {
    containers: [
      ...result.containers,
      { id: OTHERS_CONTAINER_ID, name: OTHERS_CONTAINER_NAME, files: [] },
    ],
  };
}
