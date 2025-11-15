export type FileType = 'image' | 'audio' | 'pdf';

export interface FileInfo {
  file: File;
  type: FileType;
  preview?: string;
}

