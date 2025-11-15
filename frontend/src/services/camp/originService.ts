/**
 * CAMP Origin SDK Integration Service
 * Handles IpNFT minting with watermark hash as metadata
 * 
 * Origin SDK: @campnetwork/origin
 */

// Origin SDK will be dynamically imported
// Package: @campnetwork/origin

export interface OriginConfig {
  originApi: string;
  originClientId: string;
  pinataJwt?: string;
  subgraphUrl?: string;
}

export interface MintIpNFTParams {
  watermarkHash: string;
  userId: string;
  timestamp: number;
  contentType: string;
  license: string;
  file?: File;
  additionalMetadata?: Record<string, any>;
}

export interface MintResult {
  success: boolean;
  nftId?: string;
  tokenId?: string;
  transactionHash?: string;
  message: string;
  data?: any;
}

class OriginService {
  private config: OriginConfig | null = null;
  private sdk: any = null; // Will be Auth instance
  private isAuthenticated: boolean = false;

  /**
   * Initialize Origin SDK with configuration
   */
  async initialize(config: OriginConfig): Promise<void> {
    this.config = config;

    console.log('[Origin] Attempting to import @campnetwork/origin...');
    const originModule: any = await import('@campnetwork/origin');

    console.log('[Origin] Module imported successfully');
    console.log('[Origin] Module keys:', Object.keys(originModule));
    console.log('[Origin] Module contents:', originModule);

    // The SDK exports: Auth, TwitterAPI, SpotifyAPI
    // Origin is accessed via auth.origin after authentication
    const { Auth } = originModule;

    console.log('[Origin] Found Auth class:', !!Auth);
    console.log('[Origin] Auth type:', typeof Auth);

    if (!Auth || typeof Auth !== 'function') {
      throw new Error(`Auth is not a constructor function. Found: ${typeof Auth}, value: ${Auth}`);
    }

    // Initialize Auth - this is the entry point
    // Note: Origin instance is accessed via auth.origin after connect()
    console.log('[Origin] Attempting to initialize Auth...');
    console.log('[Origin] Config - Client ID:', config.originClientId);
    console.log('[Origin] Config - Client ID length:', config.originClientId?.length || 0);
    console.log('[Origin] Config - API Key:', config.originApi ? `${config.originApi.substring(0, 20)}...` : '❌ MISSING');
    console.log('[Origin] Config - API Key length:', config.originApi?.length || 0);
    console.log('[Origin] Config - API Key full value (for debugging):', config.originApi);

    // Validate configuration
    if (!config.originClientId) {
      throw new Error('VITE_ORIGIN_CLIENT_ID is required. Please set it in your .env file.');
    }
    // Note: API key is NOT required for Auth class - only Client ID is needed

    // According to CAMP SDK documentation, Auth class only requires:
    // - clientId (required)
    // - redirectUri (optional, defaults to current URL)
    // - environment (optional, defaults to "DEVELOPMENT")
    // 
    // API key is NOT needed for Auth class - it's only used for TwitterAPI/SpotifyAPI
    // for fetching social data. Authentication works purely with clientId + wallet connection.
    const authConfig: any = {
      clientId: config.originClientId,
      redirectUri: typeof window !== 'undefined' ? window.location.origin : '',
      environment: 'DEVELOPMENT', // or 'PRODUCTION'
    };

    // Note: API key is NOT passed to Auth constructor
    // It's only used if you want to use TwitterAPI or SpotifyAPI classes
    if (config.originApi) {
      console.log('[Origin] ℹ️ API key provided (not used for Auth, but available for TwitterAPI/SpotifyAPI)');
    } else {
      console.log('[Origin] ℹ️ No API key provided (not required for wallet authentication)');
    }

    console.log('[Origin] Auth config object:', {
      clientId: authConfig.clientId,
      redirectUri: authConfig.redirectUri,
      environment: authConfig.environment,
    });
    console.log('[Origin] Note: API key is NOT required for Auth class. Only clientId is needed for wallet authentication.');

    try {
      // Log network requests for debugging (but don't modify them - let SDK handle API key)
      if (typeof window !== 'undefined') {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const url = args[0] as string;
          const options = args[1] || {};

          // Check if this is a CAMP/Origin API request
          const isOriginAPI = url && (
            url.includes('execute-api') ||
            url.includes('nonce') ||
            url.includes('client-user') ||
            url.includes('auth-testnet')
          );

          // Only log, don't modify - SDK should handle API key internally
          if (isOriginAPI) {
            console.log('[Origin] 🌐 Network Request (SDK-managed):', {
              url: url,
              method: options.method || 'GET',
              headers: options.headers instanceof Headers
                ? Object.fromEntries(options.headers.entries())
                : options.headers,
              body: options.body,
            });
          }

          const response = await originalFetch(url, options);

          // Log responses for debugging
          if (isOriginAPI) {
            console.log('[Origin] 🌐 Network Response:', {
              url: url,
              status: response.status,
              statusText: response.statusText,
            });

            // Clone response to read body without consuming it
            const clonedResponse = response.clone();
            try {
              const text = await clonedResponse.text();
              console.log('[Origin] 🌐 Response body:', text.substring(0, 500));
            } catch (e) {
              console.log('[Origin] 🌐 Could not read response body');
            }
          }

          return response;
        };
      }

      this.sdk = new Auth(authConfig);
      console.log('[Origin] ✅ Auth instance created successfully');
      console.log('[Origin] Auth instance:', this.sdk);
      console.log('[Origin] Auth methods:', Object.keys(this.sdk));

      // Note: Auth class doesn't need API key - authentication works with clientId + wallet
      // API key is only needed if you want to use TwitterAPI or SpotifyAPI classes
      if (config.originApi) {
        console.log('[Origin] ℹ️ API key available for TwitterAPI/SpotifyAPI (not used by Auth class)');
      }
    } catch (error: any) {
      console.error('[Origin] ❌ Auth instance creation failed:', error);
      console.error('[Origin] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }

    // Try to recover provider from localStorage (if user was previously authenticated)
    try {
      await this.sdk.recoverProvider();
      if (this.sdk.origin) {
        this.isAuthenticated = true;
        console.log('[Origin] ✅ Recovered previous authentication');
      }
    } catch (error) {
      console.log('[Origin] No previous authentication found');
    }
  }

  /**
   * Authenticate user via wallet connection
   * This must be called before minting NFTs
   */
  async authenticate(): Promise<void> {
    if (!this.sdk) {
      throw new Error('Origin SDK not initialized. Call initialize() first.');
    }

    console.log('[Origin] Starting authentication...');

    // First, try to recover provider from localStorage
    try {
      console.log('[Origin] Attempting to recover provider from localStorage...');
      await this.sdk.recoverProvider();
      if (this.sdk.origin) {
        this.isAuthenticated = true;
        console.log('[Origin] ✅ Recovered previous authentication');
        return;
      }
    } catch (error) {
      console.log('[Origin] No previous provider found, proceeding with new connection');
    }

    // Check for available providers
    console.log('[Origin] Checking for available wallet providers...');

    // Check if window.ethereum is available (MetaMask, etc.)
    const hasEthereum = typeof window !== 'undefined' && typeof (window as any).ethereum !== 'undefined';
    console.log('[Origin] window.ethereum available:', hasEthereum);

    if (!hasEthereum) {
      // Listen for EIP6963 providers (WalletConnect, etc.)
      console.log('[Origin] ========== STEP 3A: EIP6963 PROVIDER DETECTION ==========');
      console.log('[Origin] window.ethereum not found - waiting for EIP6963 providers...');
      console.log('[Origin] Setting up provider event listener with 5 second timeout...');

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('[Origin] ❌ Timeout: No providers detected within 5 seconds');
          reject(new Error('No wallet provider found. Please install MetaMask or another Web3 wallet and refresh the page.'));
        }, 5000); // 5 second timeout

        // Listen for providers event
        console.log('[Origin] Registering providers event listener...');
        this.sdk.on('providers', (providers: any[]) => {
          console.log('[Origin] ========== PROVIDERS EVENT RECEIVED ==========');
          clearTimeout(timeout);
          console.log('[Origin] Providers count:', providers.length);
          console.log('[Origin] Available providers:', providers.map((p: any) => ({
            name: p.info?.name,
            rdns: p.info?.rdns,
            icon: p.info?.icon ? 'Present' : 'Missing',
            provider: typeof p.provider,
          })));

          if (providers.length === 0) {
            reject(new Error('No wallet providers detected. Please install MetaMask or another Web3 wallet.'));
            return;
          }

          // Use the first available provider
          const selectedProvider = providers[0];
          console.log('[Origin] Selected provider:', {
            name: selectedProvider.info?.name,
            rdns: selectedProvider.info?.rdns,
            provider: typeof selectedProvider.provider,
          });

          console.log('[Origin] Calling setProvider()...');
          try {
            this.sdk.setProvider(selectedProvider);
            console.log('[Origin] ✅ setProvider() completed');
          } catch (error: any) {
            console.error('[Origin] ❌ setProvider() failed:', error);
            console.error('[Origin] Error details:', {
              message: error?.message,
              stack: error?.stack,
              name: error?.name,
            });
            reject(error);
            return;
          }

          // Now connect
          console.log('[Origin] ========== STEP 4A: CALLING CONNECT() ==========');
          console.log('[Origin] Calling SDK.connect()...');
          this.sdk.connect()
            .then((result: any) => {
              console.log('[Origin] ========== CONNECT() RESOLVED ==========');
              console.log('[Origin] Authentication result:', result);
              console.log('[Origin] Result type:', typeof result);
              console.log('[Origin] Result (full JSON):', JSON.stringify(result, null, 2));
              console.log('[Origin] Result keys:', result ? Object.keys(result) : 'null');
              console.log('[Origin] Result success:', result?.success);
              console.log('[Origin] Result message:', result?.message);
              console.log('[Origin] Result error:', result?.error);
              console.log('[Origin] SDK origin available:', !!this.sdk.origin);
              console.log('[Origin] SDK walletAddress:', this.sdk.walletAddress);

              if (result && result.success && this.sdk.origin) {
                this.isAuthenticated = true;
                console.log('[Origin] ✅ User authenticated successfully');
                resolve();
              } else {
                const errorMsg = result?.message || result?.error || 'Authentication failed';
                console.error('[Origin] Authentication failed - result:', result);
                console.error('[Origin] SDK origin available:', !!this.sdk.origin);

                // Check for unauthorized errors
                if (errorMsg.toLowerCase().includes('unauthorized') ||
                  errorMsg.toLowerCase().includes('401') ||
                  errorMsg.toLowerCase().includes('403') ||
                  errorMsg.toLowerCase().includes('invalid') ||
                  errorMsg.toLowerCase().includes('api key') ||
                  errorMsg.toLowerCase().includes('client id')) {
                  reject(new Error(
                    `Unauthorized: ${errorMsg}\n\n` +
                    `Troubleshooting steps:\n` +
                    `1. Check your .env file has correct values:\n` +
                    `   VITE_ORIGIN_API=${this.config?.originApi ? 'Set' : 'MISSING'}\n` +
                    `   VITE_ORIGIN_CLIENT_ID=${this.config?.originClientId ? 'Set' : 'MISSING'}\n` +
                    `2. Make sure you're using the correct API key and Client ID from CAMP\n` +
                    `3. Restart the dev server after changing .env file\n` +
                    `4. Check browser console for detailed error logs`
                  ));
                } else {
                  reject(new Error(errorMsg));
                }
              }
            })
            .catch((error: any) => {
              // Handle unauthorized errors from catch block
              console.error('[Origin] ========== CONNECT() REJECTED ==========');
              console.error('[Origin] Connect error:', error);
              console.error('[Origin] Connect error message:', error?.message);
              console.error('[Origin] Connect error name:', error?.name);
              console.error('[Origin] Connect error stack:', error?.stack);
              console.error('[Origin] Connect error type:', typeof error);
              console.error('[Origin] Connect error string:', error?.toString());
              console.error('[Origin] Connect error keys:', error ? Object.keys(error) : 'null');
              console.error('[Origin] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

              const errorMsg = error?.message || error?.toString() || 'Authentication failed';

              if (errorMsg.toLowerCase().includes('unauthorized') ||
                errorMsg.toLowerCase().includes('401') ||
                errorMsg.toLowerCase().includes('403') ||
                errorMsg.toLowerCase().includes('invalid') ||
                errorMsg.toLowerCase().includes('api key') ||
                errorMsg.toLowerCase().includes('client id')) {
                reject(new Error(
                  `Unauthorized: ${errorMsg}\n\n` +
                  `Troubleshooting steps:\n` +
                  `1. Check your .env file has correct values:\n` +
                  `   VITE_ORIGIN_API=${this.config?.originApi ? 'Set' : 'MISSING'}\n` +
                  `   VITE_ORIGIN_CLIENT_ID=${this.config?.originClientId ? 'Set' : 'MISSING'}\n` +
                  `2. Make sure you're using the correct API key and Client ID from CAMP\n` +
                  `3. Restart the dev server after changing .env file\n` +
                  `4. Check browser console for detailed error logs`
                ));
              } else {
                reject(error);
              }
            });
        });

        // Also try direct connection if window.ethereum becomes available
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          clearTimeout(timeout);
          this.sdk.off('providers');

          console.log('[Origin] Using window.ethereum provider');
          this.sdk.setProvider({
            provider: (window as any).ethereum,
            info: { name: 'MetaMask', rdns: 'io.metamask' },
          });

          this.sdk.connect()
            .then((result: any) => {
              console.log('[Origin] Authentication result:', result);
              console.log('[Origin] Result type:', typeof result);
              console.log('[Origin] Result keys:', result ? Object.keys(result) : 'null');
              console.log('[Origin] Result success:', result?.success);
              console.log('[Origin] Result message:', result?.message);
              console.log('[Origin] Result error:', result?.error);
              console.log('[Origin] SDK origin available:', !!this.sdk.origin);

              if (result && result.success && this.sdk.origin) {
                this.isAuthenticated = true;
                console.log('[Origin] ✅ User authenticated successfully');
                resolve();
              } else {
                const errorMsg = result?.message || result?.error || 'Authentication failed';
                console.error('[Origin] Authentication failed - result:', result);
                console.error('[Origin] SDK origin available:', !!this.sdk.origin);

                // Check for unauthorized errors
                if (errorMsg.toLowerCase().includes('unauthorized') ||
                  errorMsg.toLowerCase().includes('401') ||
                  errorMsg.toLowerCase().includes('403') ||
                  errorMsg.toLowerCase().includes('invalid') ||
                  errorMsg.toLowerCase().includes('api key') ||
                  errorMsg.toLowerCase().includes('client id')) {
                  reject(new Error(
                    `Unauthorized: ${errorMsg}\n\n` +
                    `Troubleshooting steps:\n` +
                    `1. Check your .env file has correct values:\n` +
                    `   VITE_ORIGIN_API=${this.config?.originApi ? 'Set' : 'MISSING'}\n` +
                    `   VITE_ORIGIN_CLIENT_ID=${this.config?.originClientId ? 'Set' : 'MISSING'}\n` +
                    `2. Make sure you're using the correct API key and Client ID from CAMP\n` +
                    `3. Restart the dev server after changing .env file\n` +
                    `4. Check browser console for detailed error logs`
                  ));
                } else {
                  reject(new Error(errorMsg));
                }
              }
            })
            .catch((error: any) => {
              // Handle unauthorized errors from catch block
              console.error('[Origin] ========== CONNECT() REJECTED ==========');
              console.error('[Origin] Connect error:', error);
              console.error('[Origin] Connect error message:', error?.message);
              console.error('[Origin] Connect error name:', error?.name);
              console.error('[Origin] Connect error stack:', error?.stack);
              console.error('[Origin] Connect error type:', typeof error);
              console.error('[Origin] Connect error string:', error?.toString());
              console.error('[Origin] Connect error keys:', error ? Object.keys(error) : 'null');
              console.error('[Origin] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

              const errorMsg = error?.message || error?.toString() || 'Authentication failed';

              if (errorMsg.toLowerCase().includes('unauthorized') ||
                errorMsg.toLowerCase().includes('401') ||
                errorMsg.toLowerCase().includes('403') ||
                errorMsg.toLowerCase().includes('invalid') ||
                errorMsg.toLowerCase().includes('api key') ||
                errorMsg.toLowerCase().includes('client id')) {
                reject(new Error(
                  `Unauthorized: ${errorMsg}\n\n` +
                  `Troubleshooting steps:\n` +
                  `1. Check your .env file has correct values:\n` +
                  `   VITE_ORIGIN_API=${this.config?.originApi ? 'Set' : 'MISSING'}\n` +
                  `   VITE_ORIGIN_CLIENT_ID=${this.config?.originClientId ? 'Set' : 'MISSING'}\n` +
                  `2. Make sure you're using the correct API key and Client ID from CAMP\n` +
                  `3. Restart the dev server after changing .env file\n` +
                  `4. Check browser console for detailed error logs`
                ));
              } else {
                reject(error);
              }
            });
        }
      });
    } else {
      // Use window.ethereum directly
      console.log('[Origin] ========== STEP 3B: DIRECT WINDOW.ETHEREUM CONNECTION ==========');
      console.log('[Origin] window.ethereum is available - using direct connection');
      console.log('[Origin] window.ethereum details:', {
        isMetaMask: (window as any).ethereum?.isMetaMask,
        selectedAddress: (window as any).ethereum?.selectedAddress,
        chainId: (window as any).ethereum?.chainId,
        networkVersion: (window as any).ethereum?.networkVersion,
        isConnected: typeof (window as any).ethereum?.isConnected === 'function' ? (window as any).ethereum.isConnected() : 'Method not available',
      });

      console.log('[Origin] Calling setProvider()...');
      try {
        this.sdk.setProvider({
          provider: (window as any).ethereum,
          info: { name: 'MetaMask', rdns: 'io.metamask' },
        });
        console.log('[Origin] ✅ setProvider() completed');
      } catch (error: any) {
        console.error('[Origin] ❌ setProvider() failed:', error);
        console.error('[Origin] Error details:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        });
        throw error;
      }

      console.log('[Origin] ========== STEP 4C: CALLING CONNECT() (DIRECT) ==========');
      console.log('[Origin] Calling SDK.connect()...');
      console.log('[Origin] SDK state before connect:', {
        hasSDK: !!this.sdk,
        hasOrigin: !!this.sdk.origin,
        walletAddress: this.sdk.walletAddress || 'Not set',
      });

      let result;
      try {
        result = await this.sdk.connect();
        console.log('[Origin] ========== CONNECT() RESOLVED (DIRECT) ==========');
        console.log('[Origin] Authentication result:', result);
        console.log('[Origin] Result type:', typeof result);
        console.log('[Origin] Result (full JSON):', JSON.stringify(result, null, 2));
        console.log('[Origin] Result keys:', result ? Object.keys(result) : 'null');
        console.log('[Origin] Result success:', result?.success);
        console.log('[Origin] Result message:', result?.message);
        console.log('[Origin] Result error:', result?.error);
        console.log('[Origin] SDK origin available:', !!this.sdk.origin);
        console.log('[Origin] SDK walletAddress:', this.sdk.walletAddress);
      } catch (connectError: any) {
        console.error('[Origin] ========== CONNECT() THREW ERROR ==========');
        console.error('[Origin] Connect error:', connectError);
        console.error('[Origin] Connect error message:', connectError?.message);
        console.error('[Origin] Connect error name:', connectError?.name);
        console.error('[Origin] Connect error stack:', connectError?.stack);
        console.error('[Origin] Connect error type:', typeof connectError);
        console.error('[Origin] Connect error string:', connectError?.toString());
        console.error('[Origin] Connect error keys:', connectError ? Object.keys(connectError) : 'null');
        console.error('[Origin] Full error object:', JSON.stringify(connectError, Object.getOwnPropertyNames(connectError), 2));

        const errorMsg = connectError?.message || connectError?.toString() || 'Authentication failed';

        // Check for unauthorized errors
        if (errorMsg.toLowerCase().includes('unauthorized') ||
          errorMsg.toLowerCase().includes('401') ||
          errorMsg.toLowerCase().includes('403') ||
          errorMsg.toLowerCase().includes('invalid') ||
          errorMsg.toLowerCase().includes('api key') ||
          errorMsg.toLowerCase().includes('client id')) {
          throw new Error(
            `Unauthorized: ${errorMsg}\n\n` +
            `Troubleshooting steps:\n` +
            `1. Check your .env file has correct values:\n` +
            `   VITE_ORIGIN_API=${this.config?.originApi ? 'Set' : 'MISSING'}\n` +
            `   VITE_ORIGIN_CLIENT_ID=${this.config?.originClientId ? 'Set' : 'MISSING'}\n` +
            `2. Make sure you're using the correct API key and Client ID from CAMP\n` +
            `3. Restart the dev server after changing .env file\n` +
            `4. Check browser console for detailed error logs`
          );
        }

        throw new Error(`Authentication failed: ${errorMsg}. Make sure your wallet is unlocked and connected.`);
      }

      if (result && result.success && this.sdk.origin) {
        this.isAuthenticated = true;
        console.log('[Origin] ✅ User authenticated successfully');
        console.log('[Origin] Wallet address:', this.sdk.walletAddress);
      } else {
        const errorMsg = result?.message || result?.error || 'Authentication failed';
        console.error('[Origin] Authentication failed - result:', result);
        console.error('[Origin] SDK origin available:', !!this.sdk.origin);

        // Check for unauthorized errors
        if (errorMsg.toLowerCase().includes('unauthorized') ||
          errorMsg.toLowerCase().includes('401') ||
          errorMsg.toLowerCase().includes('403') ||
          errorMsg.toLowerCase().includes('invalid') ||
          errorMsg.toLowerCase().includes('api key') ||
          errorMsg.toLowerCase().includes('client id')) {
          throw new Error(
            `Unauthorized: ${errorMsg}\n\n` +
            `Troubleshooting steps:\n` +
            `1. Check your .env file has correct values:\n` +
            `   VITE_ORIGIN_API=${this.config?.originApi ? 'Set' : 'MISSING'}\n` +
            `   VITE_ORIGIN_CLIENT_ID=${this.config?.originClientId ? 'Set' : 'MISSING'}\n` +
            `2. Make sure you're using the correct API key and Client ID from CAMP\n` +
            `3. Restart the dev server after changing .env file\n` +
            `4. Check browser console for detailed error logs`
          );
        }
        throw new Error(`${errorMsg}. Make sure your wallet is unlocked and connected.`);
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  getAuthenticated(): boolean {
    return this.isAuthenticated && !!this.sdk?.origin;
  }

  /**
   * Mint IpNFT with watermark hash as metadata
   */
  async mintIpNFT(params: MintIpNFTParams): Promise<MintResult> {
    if (!this.config) {
      throw new Error('Origin SDK not initialized. Call initialize() first.');
    }

    // Prepare metadata for IpNFT
    const metadata = {
      name: `Watermarked ${params.contentType} - ${params.userId}`,
      description: `Watermarked content with hash: ${params.watermarkHash}`,
      watermark_hash: params.watermarkHash,
      user_id: params.userId,
      timestamp: params.timestamp,
      content_type: params.contentType,
      license: params.license,
      ...params.additionalMetadata,
    };

    // If file is provided, upload to Pinata first (optional - failures are ignored)
    let fileUrl: string | undefined;
    if (params.file) {
      try {
        const pinataResult = await this.uploadToPinata(params.file);
        if (pinataResult) {
          fileUrl = pinataResult;
          console.log('[Origin] File uploaded to IPFS:', fileUrl);
        } else {
          console.log('[Origin] IPFS upload skipped (Pinata not configured or failed) - continuing without file URL');
        }
      } catch (error: any) {
        // Pinata failures are completely ignored - not critical
        console.warn('[Origin] IPFS upload failed (non-critical), continuing without file URL:', error.message);
        fileUrl = undefined; // Explicitly set to undefined to continue
      }
    }

    // Mint IpNFT using Origin SDK
    // Note: Origin SDK requires authentication first via auth.connect()
    // Then access origin instance via auth.origin
    if (!this.sdk) {
      throw new Error('Origin SDK not initialized. Call initialize() first.');
    }

    if (!this.sdk.origin) {
      throw new Error('User not authenticated. Call authenticate() first to connect wallet and authenticate.');
    }

    console.log('[Origin] Attempting to mint IpNFT with real SDK...');
    const origin = this.sdk.origin;

    // Use origin.registerIpNFT for metadata registration
    const licenseTerms = {
      price: BigInt(0), // Free
      duration: 0, // No expiration
      royaltyBps: 0, // No royalties
      paymentToken: '0x0000000000000000000000000000000000000000' as any, // Native token
    };

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
    const result = await origin.registerIpNFT(
      'file', // source
      deadline,
      licenseTerms,
      metadata,
      undefined, // fileKey - would need to upload file first if using file
    );

    console.log('[Origin] IpNFT registered successfully:', result);

    return {
      success: true,
      nftId: result.tokenId?.toString() || result.id,
      tokenId: result.tokenId?.toString(),
      transactionHash: result.txHash || result.transactionHash,
      message: 'IpNFT registered successfully on CAMP network',
      data: result,
    };
  }

  /**
   * Upload file to Pinata IPFS
   */
  async uploadToPinata(file: File): Promise<string | null> {
    if (!this.config?.pinataJwt) {
      console.warn('Pinata JWT not configured - skipping IPFS upload');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Add metadata for Pinata
    const metadata = JSON.stringify({
      name: file.name,
    });
    formData.append('pinataMetadata', metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 0,
    });
    formData.append('pinataOptions', options);

    try {
      console.log('[Pinata] Starting upload for file:', file.name, 'Size:', file.size);

      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.pinataJwt}`,
        },
        body: formData,
      });

      console.log('[Pinata] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Pinata upload failed: ${response.status} ${response.statusText}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage += ` - ${errorData.error || errorData.message || errorText}`;
        } catch {
          errorMessage += ` - ${errorText.substring(0, 200)}`;
        }

        console.warn('[Pinata] Upload failed (non-critical):', errorMessage);
        // Return null instead of throwing - Pinata is optional
        return null;
      }

      const data = await response.json();
      console.log('[Pinata] Upload successful:', data);

      if (!data.IpfsHash) {
        console.warn('[Pinata] Response missing IpfsHash - continuing without IPFS');
        return null;
      }

      return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
    } catch (error: any) {
      // Pinata failures are completely non-critical - just log and continue
      console.warn('[Pinata] Upload error (ignored, continuing without IPFS):', error.message);
      return null; // Always return null on any error - never throw
    }
  }

  /**
   * Query subgraph for NFT metadata
   */
  async queryNFT(watermarkHash: string): Promise<any> {
    if (!this.config?.subgraphUrl) {
      throw new Error('Subgraph URL not configured');
    }

    const query = `
      query GetNFTByWatermarkHash($hash: String!) {
        nfts(where: { watermark_hash: $hash }) {
          id
          tokenId
          owner
          watermark_hash
          metadata
        }
      }
    `;

    try {
      const response = await fetch(this.config.subgraphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { hash: watermarkHash },
        }),
      });

      if (!response.ok) {
        throw new Error(`Subgraph query failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      console.error('Subgraph query error:', error);
      throw new Error(`Failed to query subgraph: ${error.message}`);
    }
  }
}

export const originService = new OriginService();

