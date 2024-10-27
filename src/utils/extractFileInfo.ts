export function extractFileInfo(filePath: string) {
  const pathParts = filePath.split('/');
  const fullFileName = pathParts.pop() ?? '';
  const fileNameParts = fullFileName.split('.');
  const extension = fileNameParts.length > 1 ? fileNameParts.pop() ?? '' : '';

  return {
    path: pathParts.join('/'),
    fileName: fileNameParts.join('.'),
    extension,
  }
}
