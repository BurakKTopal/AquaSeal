import React, { useState } from 'react';
import { useOriginReact } from '../../hooks/useOriginReact';
import WalletConnection from '../../components/auth/WalletConnection';
import styles from './MintTestPage.module.css';

const MintTestPage: React.FC = () => {
  const {
    authenticated,
    minting,
    querying,
    mintIpNFT,
    queryNFT
  } = useOriginReact();

  const [formData, setFormData] = useState({
    watermarkHash: '',
    userId: 'test_user_123',
    contentType: 'image/png',
    license: 'CC-BY-4.0',
    personalInfo: 'Test personal info',
  });

  const [mintResult, setMintResult] = useState<any>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Query/Verification state
  const [queryHash, setQueryHash] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const generateTestHash = () => {
    // Generate a random test hash
    const randomHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setFormData(prev => ({
      ...prev,
      watermarkHash: randomHash
    }));
  };

  const handleMint = async () => {
    if (!formData.watermarkHash) {
      setMintError('Please enter a watermark hash');
      return;
    }

    setMintResult(null);
    setMintError(null);

    try {
      const result = await mintIpNFT({
        watermarkHash: formData.watermarkHash,
        userId: formData.userId,
        timestamp: Date.now(),
        contentType: formData.contentType,
        license: formData.license,
        file: selectedFile || undefined,
        additionalMetadata: {
          personal_info: formData.personalInfo,
        },
      });

      setMintResult(result);

      if (result.success) {
        console.log('✅ Minting successful:', result);
      } else {
        console.warn('⚠️ Minting result:', result);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to mint NFT';
      setMintError(errorMessage);
      console.error('❌ Minting error:', err);
    }
  };

  const handleQuery = async () => {
    if (!queryHash.trim()) {
      setQueryError('Please enter a watermark hash to query');
      return;
    }

    setQueryResult(null);
    setQueryError(null);

    try {
      const result = await queryNFT(queryHash.trim());
      setQueryResult(result);
      console.log('✅ Query successful:', result);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to query NFT';
      setQueryError(errorMessage);
      console.error('❌ Query error:', err);
    }
  };

  const copyHashToQuery = () => {
    if (formData.watermarkHash) {
      setQueryHash(formData.watermarkHash);
    }
  };


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>NFT Minting Test Page</h1>
        <p className={styles.subtitle}>
          Test Origin SDK NFT minting in isolation
        </p>
      </div>

      {/* Authentication Section */}
      <div className={styles.statusSection}>
        <WalletConnection
          onAuthenticated={(method) => {
            console.log('[MintTest] Authenticated via:', method);
          }}
        />
      </div>

      {/* Minting Form */}
      <div className={styles.formSection}>
        <h2>Mint Test NFT</h2>

        <div className={styles.formGroup}>
          <label htmlFor="watermarkHash">
            Watermark Hash <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputGroup}>
            <input
              type="text"
              id="watermarkHash"
              name="watermarkHash"
              value={formData.watermarkHash}
              onChange={handleInputChange}
              placeholder="Enter watermark hash (64 hex characters)"
              className={styles.input}
              disabled={minting}
            />
            <button
              type="button"
              onClick={generateTestHash}
              className={styles.buttonSecondary}
              disabled={minting}
            >
              Generate Test Hash
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="userId">User ID</label>
          <input
            type="text"
            id="userId"
            name="userId"
            value={formData.userId}
            onChange={handleInputChange}
            className={styles.input}
            disabled={minting}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="contentType">Content Type</label>
          <select
            id="contentType"
            name="contentType"
            value={formData.contentType}
            onChange={handleInputChange}
            className={styles.input}
            disabled={minting}
          >
            <option value="image/png">image/png</option>
            <option value="image/jpeg">image/jpeg</option>
            <option value="audio/mpeg">audio/mpeg</option>
            <option value="text/plain">text/plain</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="license">License</label>
          <input
            type="text"
            id="license"
            name="license"
            value={formData.license}
            onChange={handleInputChange}
            className={styles.input}
            disabled={minting}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="personalInfo">Personal Info (Optional)</label>
          <textarea
            id="personalInfo"
            name="personalInfo"
            value={formData.personalInfo}
            onChange={handleInputChange}
            className={styles.textarea}
            rows={3}
            disabled={minting}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="file">File (Optional - for Pinata IPFS upload)</label>
          <input
            type="file"
            id="file"
            name="file"
            onChange={handleFileChange}
            className={styles.input}
            disabled={minting}
          />
          {selectedFile && (
            <div className={styles.fileInfo}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleMint}
          className={styles.buttonPrimary}
          disabled={minting || !authenticated || !formData.watermarkHash}
        >
          {minting ? '⏳ Minting...' : '🚀 Mint NFT'}
        </button>

        {!authenticated && (
          <div className={styles.warning}>
            ⚠️ Please connect your wallet and authenticate first using the button above.
          </div>
        )}
      </div>

      {/* Hash Query/Verification Section */}
      <div className={styles.querySection}>
        <h2>Check Hash Existence</h2>
        <p className={styles.sectionDescription}>
          Query the CAMP network to check if an NFT with a specific watermark hash exists
        </p>

        <div className={styles.formGroup}>
          <label htmlFor="queryHash">
            Watermark Hash to Query <span className={styles.required}>*</span>
          </label>
          <div className={styles.inputGroup}>
            <input
              type="text"
              id="queryHash"
              name="queryHash"
              value={queryHash}
              onChange={(e) => setQueryHash(e.target.value)}
              placeholder="Enter watermark hash to check"
              className={styles.input}
              disabled={querying}
            />
            {formData.watermarkHash && (
              <button
                type="button"
                onClick={copyHashToQuery}
                className={styles.buttonSecondary}
                disabled={querying}
                title="Copy hash from mint form"
              >
                Copy from Mint
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleQuery}
          className={styles.buttonPrimary}
          disabled={querying || !queryHash.trim()}
        >
          {querying ? '⏳ Querying...' : '🔍 Check Hash'}
        </button>

        {queryError && (
          <div className={styles.errorBox}>
            <h3>❌ Query Error</h3>
            <pre className={styles.errorPre}>{queryError}</pre>
          </div>
        )}

        {queryResult && (
          <div className={`${styles.resultBox} ${queryResult.nfts && queryResult.nfts.length > 0 ? styles.successBox : styles.warningBox}`}>
            <h3>{queryResult.nfts && queryResult.nfts.length > 0 ? '✅ NFT Found' : '⚠️ NFT Not Found'}</h3>
            <div className={styles.resultContent}>
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Exists:</span>
                <span className={styles.resultValue}>
                  {queryResult.nfts && queryResult.nfts.length > 0 ? `Yes (${queryResult.nfts.length} found)` : 'No'}
                </span>
              </div>
              {queryResult.nfts && queryResult.nfts.length > 0 && queryResult.nfts[0].id && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>NFT ID:</span>
                  <span className={styles.resultValue}>{queryResult.nfts[0].id}</span>
                </div>
              )}
              {queryResult.nfts && queryResult.nfts.length > 0 && queryResult.nfts[0].tokenId && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Token ID:</span>
                  <span className={styles.resultValue}>{queryResult.nfts[0].tokenId}</span>
                </div>
              )}
              {queryResult.nfts && queryResult.nfts.length > 0 && queryResult.nfts[0].owner && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Owner:</span>
                  <span className={styles.resultValue}>{queryResult.nfts[0].owner}</span>
                </div>
              )}
              {queryResult.nfts && queryResult.nfts.length > 0 && queryResult.nfts[0].watermark_hash && (
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Watermark Hash:</span>
                  <span className={styles.resultValue}>{queryResult.nfts[0].watermark_hash}</span>
                </div>
              )}
              <div className={styles.resultItem}>
                <span className={styles.resultLabel}>Full Response:</span>
                <pre className={styles.resultPre}>{JSON.stringify(queryResult, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {(mintResult || mintError) && (
        <div className={styles.resultsSection}>
          <h2>Minting Result</h2>

          {mintError && (
            <div className={styles.errorBox}>
              <h3>❌ Error</h3>
              <pre className={styles.errorPre}>{mintError}</pre>
            </div>
          )}

          {mintResult && (
            <div className={`${styles.resultBox} ${mintResult.success ? styles.successBox : styles.warningBox}`}>
              <h3>{mintResult.success ? '✅ Success' : '⚠️ Result'}</h3>
              <div className={styles.resultContent}>
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Success:</span>
                  <span className={styles.resultValue}>{mintResult.success ? 'Yes' : 'No'}</span>
                </div>
                <div className={styles.resultItem}>
                  <span className={styles.resultLabel}>Message:</span>
                  <span className={styles.resultValue}>{mintResult.message}</span>
                </div>
                {mintResult.nftId && (
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>NFT ID:</span>
                    <span className={styles.resultValue}>{mintResult.nftId}</span>
                  </div>
                )}
                {mintResult.tokenId && (
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>Token ID:</span>
                    <span className={styles.resultValue}>{mintResult.tokenId}</span>
                  </div>
                )}
                {mintResult.transactionHash && (
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>Transaction Hash:</span>
                    <span className={styles.resultValue}>{mintResult.transactionHash}</span>
                  </div>
                )}
                {mintResult.data && (
                  <div className={styles.resultItem}>
                    <span className={styles.resultLabel}>Full Data:</span>
                    <pre className={styles.resultPre}>{JSON.stringify(mintResult.data, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Debug Info */}
      <div className={styles.debugSection}>
        <h2>Debug Information</h2>
        <div className={styles.debugContent}>
          <p><strong>Check browser console</strong> for detailed logs:</p>
          <ul>
            <li>Origin SDK initialization status</li>
            <li>Minting request details</li>
            <li>API responses</li>
            <li>Error traces</li>
          </ul>
          <p className={styles.debugNote}>
            Open DevTools (F12) → Console tab to see detailed debugging information
          </p>
        </div>
      </div>
    </div>
  );
};

export default MintTestPage;

