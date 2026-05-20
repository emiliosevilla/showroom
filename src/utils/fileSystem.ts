import { ClassificationResult } from '../services/classifier';

export interface FileEntry {
  path: string;
  name: string;
  kind: 'file' | 'directory';
  lastModified?: number;
  extension?: string;
  fileObject?: File;
}

export function processFileList(files: FileList): { entries: FileEntry[], rootName: string } {
  const result: FileEntry[] = [];
  const directoriesAdded = new Set<string>();

  if (files.length === 0) return { entries: [], rootName: '' };
  
  const firstPath = files[0].webkitRelativePath || files[0].name;
  const rootName = firstPath.split('/')[0] || 'Carpeta';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split('/');
    
    if (parts.length > 0) {
      parts.shift(); // Remove root folder name
    }

    if (parts.length === 0) continue;

    let currentPath = '';
    for (let j = 0; j < parts.length - 1; j++) {
      currentPath = currentPath ? `${currentPath}/${parts[j]}` : parts[j];
      if (!directoriesAdded.has(currentPath)) {
        directoriesAdded.add(currentPath);
        result.push({
          path: currentPath,
          name: parts[j],
          kind: 'directory',
          lastModified: 0,
          extension: ''
        });
      }
    }

    const name = parts[parts.length - 1];
    const nameParts = name.split('.');
    const extension = nameParts.length > 1 ? nameParts.pop()?.toLowerCase() || '' : '';
    const finalPath = parts.join('/');

    result.push({
      path: finalPath,
      name: name,
      kind: 'file',
      lastModified: file.lastModified,
      extension: extension,
      fileObject: file
    });
  }

  return { entries: result, rootName };
}

export async function scanDirectory(dirHandle: any, basePath: string = ''): Promise<FileEntry[]> {
  const files: FileEntry[] = [];
  
  // Recursive function requires async iteration over handles
  async function readDir(handle: FileSystemDirectoryHandle, currentPath: string) {
    try {
      // @ts-ignore - TS might not have full types for FileSystemHandle methods natively everywhere
      for await (const entry of handle.values()) {
        const fullRelativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        
        if (entry.kind === 'file') {
          let lastMod = 0;
          let fileObj: File | undefined = undefined;
          try {
            const file = await entry.getFile();
            lastMod = file.lastModified;
            fileObj = file;
          } catch (e) {
            // ignore this file
            console.warn(`Ignoring file ${fullRelativePath} due to access error:`, e);
            continue;
          }

          const parts = entry.name.split('.');
          const extension = parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';

          files.push({
            path: fullRelativePath,
            name: entry.name,
            kind: 'file',
            lastModified: lastMod,
            extension,
            fileObject: fileObj
          });
        } else if (entry.kind === 'directory') {
          files.push({
            path: fullRelativePath,
            name: entry.name,
            kind: 'directory',
            lastModified: 0,
            extension: ''
          });
          
          // Let's cap the depth to avoid massive freeze on "C:\"!
          if (fullRelativePath.split('/').length < 20) {
            try {
              await readDir(entry as FileSystemDirectoryHandle, fullRelativePath);
            } catch (e) {
              console.warn(`Ignoring directory ${fullRelativePath} due to access error:`, e);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Failed reading directory ${currentPath}:`, e);
    }
  }

  await readDir(dirHandle, basePath);
  return files;
}

export async function applyChangesToDisk(dirHandle: any, classification: ClassificationResult, scannedFiles: FileEntry[]) {
  // Check permissions
  if ((await dirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    const permission = await dirHandle.requestPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      throw new Error('Permisos de lectura/escritura denegados.');
    }
  }

  let copiedCount = 0;
  
  // 1. Process writing to new paths
  for (const container of classification.containers) {
    if (container.files.length === 0) continue;
    
    // Create folder for the container directly in the root
    const containerDir = await dirHandle.getDirectoryHandle(container.name, { create: true });
    
    for (const filePath of container.files) {
      const fileEntry = scannedFiles.find(sf => sf.path === filePath);
      if (fileEntry && fileEntry.fileObject) {
         const targetPath = `${container.name}/${fileEntry.name}`;
         // Si ya está en la ubicación correcta, no sobreescribir para ahorrar tiempo/evitar borrarlo luego accidentalmente
         if (filePath === targetPath) {
             copiedCount++;
             continue;
         }
         
         try {
           // Resolve name collision if a file with this name already exists in target directory
           let uniqueName = fileEntry.name;
           let hasCollision = true;
           let counter = 1;

           // Detect extension and base name
           const parts = fileEntry.name.split('.');
           const ext = parts.length > 1 ? `.${parts.pop()}` : '';
           const base = parts.join('.');

           while (hasCollision) {
             try {
               await containerDir.getFileHandle(uniqueName);
               // If we get here, the file exists! So we need a new name.
               uniqueName = `${base} (${counter})${ext}`;
               counter++;
             } catch {
               // Throws error if file does not exist, so the name is unique!
               hasCollision = false;
             }
           }

           const fileHandle = await containerDir.getFileHandle(uniqueName, { create: true });
           const writable = await fileHandle.createWritable();
           await writable.write(fileEntry.fileObject);
           await writable.close();
           copiedCount++;
         } catch (e) {
           console.error(`Error copying ${filePath} to ${container.name}`, e);
         }
      }
    }
  }

  // Helper para borrar archivos
  async function deleteFileByPath(rootDirHandle: any, relativePath: string, isDirectory: boolean = false) {
      const parts = relativePath.split('/');
      const name = parts.pop();
      if (!name) return;
      
      let currentDir = rootDirHandle;
      for (const part of parts) {
          try {
              currentDir = await currentDir.getDirectoryHandle(part);
          } catch {
              return; // Doesn't exist
          }
      }
      
      try {
          await currentDir.removeEntry(name, { recursive: isDirectory });
      } catch {
          // Ignore
      }
  }

  // 2. Delete all files from their original locations if they were moved OR deleted permanently
  const allCurrentFiles = new Map<string, string>(); // originalPath -> targetPath
  for (const container of classification.containers) {
      for (const filePath of container.files) {
          const fileEntry = scannedFiles.find(sf => sf.path === filePath);
          if (fileEntry) {
              allCurrentFiles.set(filePath, `${container.name}/${fileEntry.name}`);
          }
      }
  }

  for (const fileEntry of scannedFiles) {
      if (fileEntry.kind === 'file') {
          const targetPath = allCurrentFiles.get(fileEntry.path);
          if (targetPath) {
              // File was moved
              if (fileEntry.path !== targetPath) {
                  await deleteFileByPath(dirHandle, fileEntry.path, false);
              }
          } else {
              // File was permanently deleted (not in any container)
              await deleteFileByPath(dirHandle, fileEntry.path, false);
          }
      }
  }

  // 3. Clean up empty directories
  const originalDirs = new Set(scannedFiles.filter(f => f.kind === 'directory').map(f => f.path));
  // Sort descending so we delete deepest folders first
  const sortedDirs = Array.from(originalDirs).sort((a, b) => b.split('/').length - a.split('/').length);
  
  for (const dirPath of sortedDirs) {
      // Don't delete our newly created container directories
      const isContainerDir = classification.containers.some(c => c.name === dirPath);
      if (!isContainerDir) {
         try {
             // Sin recursive para que solo borre si está vacía
             await deleteFileByPath(dirHandle, dirPath, false);
         } catch (e) {}
      }
  }

  return copiedCount;
}
