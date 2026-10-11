/**
 * Determine the ENCross subfolder category based on file extension and MIME type.
 * Categories:
 * - 'Image': Images (jpg, png, gif, webp, svg, etc.)
 * - 'Video': Videos (mp4, mkv, webm, avi, mov, etc.)
 * - 'Audio': Audio files (mp3, wav, ogg, m4a, flac, etc.)
 * - 'Document': Documents (pdf, doc, docx, xls, xlsx, ppt, pptx, txt, csv, etc.)
 * - '': Miscellaneous / other files (stored directly in Downloads/ENCross)
 */
export function getEncrossSubfolder(fileName = '', mimeType = '') {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  const mime = (mimeType || '').toLowerCase();

  // 1. Images -> /ENCross/Image
  if (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif', 'heic', 'heif', 'raw'].includes(ext)
  ) {
    return 'Image';
  }

  // 2. Videos -> /ENCross/Video
  if (
    mime.startsWith('video/') ||
    ['mp4', 'mkv', 'webm', 'avi', 'mov', 'wmv', 'flv', '3gp', 'm4v', 'ts'].includes(ext)
  ) {
    return 'Video';
  }

  // 3. Audio -> /ENCross/Audio
  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'mid', 'midi'].includes(ext)
  ) {
    return 'Audio';
  }

  // 4. Documents -> /ENCross/Document
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('officedocument') ||
    mime.includes('text') ||
    mime.includes('excel') ||
    mime.includes('powerpoint') ||
    ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'md', 'epub', 'rtf'].includes(ext)
  ) {
    return 'Document';
  }

  // 5. Acak / Miscellaneous / Others -> directly in /ENCross
  return '';
}
