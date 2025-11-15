import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './FileUpload.module.css';
import { FileType } from '../../../types/file';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  fileType?: FileType | null;
  preview?: string | null;
  error?: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  fileType,
  preview,
  error,
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff'],
      'audio/*': ['.wav', '.mp3', '.flac', '.ogg', '.m4a'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: false,
  });

  return (
    <div className="file-upload-container">
      <div
        {...getRootProps()}
        className={`file-upload-dropzone ${isDragActive ? 'drag-active' : ''} ${error ? 'error' : ''}`}
      >
        <input {...getInputProps()} />
        {preview && fileType === 'image' ? (
          <div className="file-preview">
            <img src={preview} alt="Preview" />
          </div>
        ) : (
          <div className="file-upload-content">
            <div className="file-upload-icon">📁</div>
            <p className="file-upload-text">
              {isDragActive
                ? 'Drop the file here...'
                : 'Drag & drop a file here, or click to select'}
            </p>
            <p className="file-upload-hint">
              Supports: Images (JPG, PNG, BMP, TIFF), Audio (WAV, MP3, FLAC, OGG, M4A), and PDFs
            </p>
            <p className="file-upload-hint">Max size: 50MB</p>
          </div>
        )}
      </div>
      {error && <p className="file-upload-error">{error}</p>}
      {fileType && !preview && (
        <p className="file-upload-info">Selected: {fileType} file</p>
      )}
    </div>
  );
};

export default FileUpload;

