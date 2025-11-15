import React from 'react';
import styles from './VerificationResult.module.css';
import { VerificationResponse } from '../../../types/api';

interface VerificationResultProps {
  result: VerificationResponse;
  onReset?: () => void;
}

const VerificationResult: React.FC<VerificationResultProps> = ({ result, onReset }) => {
  const getStatusClass = () => {
    if (!result.watermark_found) {
      return styles.noWatermark;
    }
    if (result.match) {
      return styles.verified;
    }
    return styles.notVerified;
  };

  const getStatusIcon = () => {
    if (!result.watermark_found) {
      return '✗';
    }
    if (result.match) {
      return '✓';
    }
    return '⚠';
  };

  const getStatusText = () => {
    if (!result.watermark_found) {
      return 'No Watermark Found';
    }
    if (result.match) {
      return 'Watermark Verified';
    }
    return 'Watermark Found But Not Registered';
  };

  return (
    <div className={`${styles.container} ${getStatusClass()}`}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.icon}>{getStatusIcon()}</div>
          <h2 className={styles.title}>{getStatusText()}</h2>
        </div>

        <p className={styles.message}>{result.message}</p>

        {result.watermark_hash && (
          <div className={styles.hashDisplay}>
            <label>Watermark Hash</label>
            <code>{result.watermark_hash}</code>
          </div>
        )}

        {result.nft_metadata && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>NFT Metadata</h3>
            <pre className={styles.code}>{JSON.stringify(result.nft_metadata, null, 2)}</pre>
          </div>
        )}

        {result.payload && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Watermark Payload</h3>
            <div className={styles.payload}>
              <div className={styles.payloadItem}>
                <span className={styles.label}>User ID:</span>
                <span className={styles.value}>{result.payload.user_id}</span>
              </div>
              <div className={styles.payloadItem}>
                <span className={styles.label}>Timestamp:</span>
                <span className={styles.value}>
                  {new Date(result.payload.timestamp * 1000).toLocaleString()}
                </span>
              </div>
              <div className={styles.payloadItem}>
                <span className={styles.label}>License:</span>
                <span className={styles.value}>{result.payload.license}</span>
              </div>
            </div>
          </div>
        )}

        {result.debug_info && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Debug Information</h3>
            <ul className={styles.debugList}>
              {result.debug_info.map((info: string, index: number) => (
                <li key={index} className={styles.debugItem}>{info}</li>
              ))}
            </ul>
          </div>
        )}

        {onReset && (
          <div className={styles.actions}>
            <button onClick={onReset} className={styles.resetBtn}>
              Verify Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationResult;
