import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import styles from './ImageUpload.module.css';
import { FileType } from '../../../types/file';

interface ImageUploadProps {
  onFileSelect: (file: File) => void;
  preview?: string | null;
  fileType?: FileType | null;
  error?: string | null;
  onClear?: () => void;
  file?: File | null;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onFileSelect,
  preview,
  fileType,
  error,
  onClear,
  file,
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const onDropRejected = useCallback((rejectedFiles: any[]) => {
    const rejection = rejectedFiles[0];
    if (rejection) {
      // Check if it's a file type issue or size issue
      if (rejection.errors.some((e: any) => e.code === 'file-invalid-type')) {
        // Try to accept by extension anyway (some MP3 files have wrong MIME types)
        const file = rejection.file;
        const fileName = file.name.toLowerCase();
        const extension = fileName.substring(fileName.lastIndexOf('.'));
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.wav', '.mp3', '.flac', '.ogg', '.m4a', '.pdf'];
        
        if (allowedExtensions.includes(extension)) {
          // Accept the file even though MIME type didn't match
          onFileSelect(file);
          return;
        }
      }
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/bmp': ['.bmp'],
      'image/tiff': ['.tiff'],
      'audio/wav': ['.wav'],
      'audio/mpeg': ['.mp3'],
      'audio/mp3': ['.mp3'],
      'audio/x-mpeg': ['.mp3'],
      'audio/mpeg3': ['.mp3'],
      'audio/flac': ['.flac'],
      'audio/ogg': ['.ogg'],
      'audio/m4a': ['.m4a'],
      'audio/x-m4a': ['.m4a'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    noClick: false,
    noKeyboard: false,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const dropzoneProps = getRootProps();
  const inputProps = getInputProps();

  // Show preview for images
  if (preview && fileType === 'image') {
    return (
      <div className={styles.previewContainer}>
        <div 
          {...dropzoneProps}
          className={styles.imageFrame}
        >
          <input {...inputProps} />
          <img src={preview} alt="Preview" className={styles.previewImage} />
          {onClear && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }} 
              className={styles.clearButton} 
              aria-label="Remove image"
            >
              ×
            </button>
          )}
        </div>
        <p className={styles.previewHint}>Click the image to upload a different file</p>
      </div>
    );
  }

  // Show file info for audio files
  if (file && fileType === 'audio') {
    return (
      <div className={styles.previewContainer}>
        <div 
          {...dropzoneProps}
          className={styles.audioFrame}
        >
          <input {...inputProps} />
          <div className={styles.audioIcon}>🎵</div>
          <div className={styles.audioInfo}>
            <h3 className={styles.audioFileName}>{file.name}</h3>
            <p className={styles.audioFileDetails}>
              {fileType.toUpperCase()} • {formatFileSize(file.size)}
            </p>
            <p className={styles.audioHint}>Click to select a different file</p>
          </div>
          {onClear && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }} 
              className={styles.clearButton} 
              aria-label="Remove file"
            >
              ×
            </button>
          )}
        </div>
        <p className={styles.previewHint}>File selected. Fill in metadata below to continue.</p>
      </div>
    );
  }

  // Show file info for PDF files
  if (file && fileType === 'pdf') {
    return (
      <div className={styles.previewContainer}>
        <div 
          {...dropzoneProps}
          className={styles.audioFrame}
        >
          <input {...inputProps} />
          <div className={styles.audioIcon}>📄</div>
          <div className={styles.audioInfo}>
            <h3 className={styles.audioFileName}>{file.name}</h3>
            <p className={styles.audioFileDetails}>
              {fileType.toUpperCase()} • {formatFileSize(file.size)}
            </p>
            <p className={styles.audioHint}>Click to select a different file</p>
          </div>
          {onClear && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }} 
              className={styles.clearButton} 
              aria-label="Remove file"
            >
              ×
            </button>
          )}
        </div>
        <p className={styles.previewHint}>File selected. Fill in metadata below to continue.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div
        {...dropzoneProps}
        className={`${styles.dropzone} ${isDragActive ? styles.dragActive : ''} ${error ? styles.error : ''}`}
      >
        <input {...inputProps} />
        <div className={styles.content}>
          <div className={styles.icon}>
            {isDragActive ? '📤' : '📁'}
          </div>
          <h3 className={styles.title}>
            {isDragActive ? 'Drop your file here' : 'Drag & drop your file'}
          </h3>
          <p className={styles.subtitle}>
            or click to browse
          </p>
          <div className={styles.supported}>
            <span>Supports: Images (JPG, PNG, BMP, TIFF) • Audio (MP3) • PDFs</span>
            <span>Max size: 50MB</span>
          </div>
        </div>
      </div>
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
