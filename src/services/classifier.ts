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

export async function classifyFiles(files: FileEntry[]): Promise<ClassificationResult> {
  // Simulate a slight delay to keep UI fluid
  await new Promise(res => setTimeout(res, 500));

  const groups: Record<string, string[]> = {
    'cat_subfolders': [],
    'cat_executables': [],
    'cat_graphics': [],
    'cat_docs': [],
    'cat_compressed': [],
    'cat_multimedia': [],
    'cat_code': [],
    'cat_misc': []
  };

  for (const file of files) {
    if (file.kind === 'directory') {
      groups['cat_subfolders'].push(file.path);
    } else {
      const ext = file.extension?.toLowerCase() || '';
      if (ext) {
        const groupName = EXTENSION_MAP[ext] || 'cat_misc';
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(file.path);
      } else {
        groups['cat_misc'].push(file.path);
      }
    }
  }

  const containers = Object.entries(groups)
    .filter(([_, groupFiles]) => groupFiles.length > 0)
    .map(([name, groupFiles], idx) => ({
      id: `cont_${idx}`,
      name,
      files: groupFiles
    }));

  return { containers };
}

