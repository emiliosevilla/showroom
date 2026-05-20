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
  'exe': 'Ejecutables y Herramientas',
  'msi': 'Ejecutables y Herramientas',
  'bat': 'Ejecutables y Herramientas',
  'sh': 'Ejecutables y Herramientas',
  'app': 'Ejecutables y Herramientas',
  'apk': 'Ejecutables y Herramientas',
  'bin': 'Ejecutables y Herramientas',

  'png': 'Recursos Gráficos',
  'jpg': 'Recursos Gráficos',
  'jpeg': 'Recursos Gráficos',
  'gif': 'Recursos Gráficos',
  'svg': 'Recursos Gráficos',
  'webp': 'Recursos Gráficos',
  'psd': 'Recursos Gráficos',
  'ai': 'Recursos Gráficos',
  'ico': 'Recursos Gráficos',

  'pdf': 'Documentación',
  'doc': 'Documentación',
  'docx': 'Documentación',
  'txt': 'Documentación',
  'md': 'Documentación',
  'xls': 'Documentación',
  'xlsx': 'Documentación',
  'csv': 'Documentación',

  'zip': 'Archivos Comprimidos',
  'rar': 'Archivos Comprimidos',
  '7z': 'Archivos Comprimidos',
  'tar': 'Archivos Comprimidos',
  'gz': 'Archivos Comprimidos',

  'mp3': 'Multimedia',
  'mp4': 'Multimedia',
  'wav': 'Multimedia',
  'avi': 'Multimedia',
  'mkv': 'Multimedia',
  'mov': 'Multimedia',

  'js': 'Proyectos de Código',
  'ts': 'Proyectos de Código',
  'html': 'Proyectos de Código',
  'css': 'Proyectos de Código',
  'json': 'Proyectos de Código',
  'py': 'Proyectos de Código',
  'java': 'Proyectos de Código',
  'cpp': 'Proyectos de Código',
  'c': 'Proyectos de Código',
  'tsx': 'Proyectos de Código',
  'jsx': 'Proyectos de Código',
};

export async function classifyFiles(files: FileEntry[]): Promise<ClassificationResult> {
  // Simulamos un breve retraso para mantener la fluidez de la interfaz
  await new Promise(res => setTimeout(res, 500));

  const groups: Record<string, string[]> = {
    'Subcarpetas': [],
    'Ejecutables y Herramientas': [],
    'Recursos Gráficos': [],
    'Documentación': [],
    'Archivos Comprimidos': [],
    'Multimedia': [],
    'Proyectos de Código': [],
    'Varios': []
  };

  for (const file of files) {
    if (file.kind === 'directory') {
      groups['Subcarpetas'].push(file.path);
    } else {
      const ext = file.extension?.toLowerCase() || '';
      if (ext) {
        const groupName = EXTENSION_MAP[ext] || 'Varios';
        if (!groups[groupName]) {
          groups[groupName] = [];
        }
        groups[groupName].push(file.path);
      } else {
        groups['Varios'].push(file.path);
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
