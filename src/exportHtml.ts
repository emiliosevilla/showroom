export function getImagePreview(file: File | undefined): string {
  if (!file) return '';
  try {
    return URL.createObjectURL(file);
  } catch {
    return '';
  }
}
