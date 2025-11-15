import { useState } from 'react';
import { FileType } from '../types/file';
import { validateFileType, validateFileSize } from '../utils/fileValidation';

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);

    // Validate file type
    const type = validateFileType(selectedFile);
    if (!type) {
      setError('Invalid file type. Please upload an image, audio, or PDF file.');
      return;
    }

    // Validate file size
    if (!validateFileSize(selectedFile, 50)) {
      setError('File size exceeds 50MB limit.');
      return;
    }

    setFile(selectedFile);
    setFileType(type);

    // Create preview for images
    if (type === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileType(null);
    setPreview(null);
    setError(null);
  };

  return {
    file,
    fileType,
    preview,
    error,
    handleFileSelect,
    clearFile,
  };
}

