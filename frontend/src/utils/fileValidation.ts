import { FileType } from '../types/file';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff'];
const ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg', 'audio/flac', 'audio/ogg', 'audio/m4a', 'audio/x-m4a'];
const ALLOWED_PDF_TYPES = ['application/pdf'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'];
const ALLOWED_AUDIO_EXTENSIONS = ['.wav', '.mp3', '.flac', '.ogg', '.m4a'];
const ALLOWED_PDF_EXTENSIONS = ['.pdf'];

export function validateFileType(file: File): FileType | null {
  // First check MIME type
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'image';
  }
  if (ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return 'audio';
  }
  if (ALLOWED_PDF_TYPES.includes(file.type)) {
    return 'pdf';
  }
  
  // Fallback: check file extension if MIME type is not recognized
  // (Some browsers/systems may report incorrect MIME types)
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));
  
  if (ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return 'image';
  }
  if (ALLOWED_AUDIO_EXTENSIONS.includes(extension)) {
    return 'audio';
  }
  if (ALLOWED_PDF_EXTENSIONS.includes(extension)) {
    return 'pdf';
  }
  
  return null;
}

export function validateFileSize(file: File, maxSizeMB: number = 50): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

