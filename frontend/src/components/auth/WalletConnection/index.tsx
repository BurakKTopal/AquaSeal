import React, { useState, useEffect } from 'react';
import {
  CampModal,
  useAuthState,
  useModal as useCampModal,
  useConnect,
} from "@campnetwork/origin/react";
import {
  useModal,
  useWallet,
  OAuthMethod,
  ParaModal,
} from "@getpara/react-sdk";
import { useAccount as useWagmiAccount, useDisconnect as useWagmiDisconnect } from "wagmi";
import { generateProvider } from '../../../utils/walletUtils';
import styles from './WalletConnection.module.css';

export type AuthMethod = 'wallet' | 'google';

interface WalletConnectionProps {
  onAuthenticated?: (method: AuthMethod) => void;
  showTitle?: boolean;
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  onAuthenticated,
  showTitle = true,
}) => {
  const { authenticated } = useAuthState();
  const { disconnect: disconnectOrigin } = useConnect();
  const { openModal: openCampModal } = useCampModal();
  const { data: wallet } = useWallet();
  const { openModal } = useModal();
  const { disconnect: disconnectWagmi } = useWagmiDisconnect();
  const acc = useWagmiAccount();

  const [provider, setProvider] = useState<any>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Generate provider from wagmi account
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | number | undefined;
    if (wallet?.address && !isDisconnecting) {
      timeoutId = setTimeout(async () => {
        try {
          const newProvider = await generateProvider(acc);
          setProvider(newProvider);
        } catch (error) {
          console.warn('[WalletConnection] Error generating provider:', error);
          setProvider(null);
        }
      }, 200);
    } else if (!wallet?.address) {
      setProvider(null);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [acc, wallet?.address, isDisconnecting]);

  // Notify parent when authenticated
  useEffect(() => {
    if (authenticated && wallet?.address) {
      onAuthenticated?.('wallet');
    }
  }, [authenticated, wallet?.address, onAuthenticated]);

  const handleWalletConnect = () => {
    if (!wallet?.address) {
      // First connect wallet via Para
      openModal();
    } else if (!authenticated) {
      // Then authenticate with Origin
      openCampModal();
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);

      // Disconnect Origin SDK first
      try {
        disconnectOrigin();
      } catch (error) {
        console.warn('[Wallet] Error disconnecting Origin:', error);
      }

      // Small delay to ensure Origin disconnect completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Disconnect Wagmi (this will also disconnect Para wallet)
      try {
        disconnectWagmi();
      } catch (error) {
        console.warn('[Wallet] Error disconnecting Wagmi:', error);
      }

      // Clear provider state
      setProvider(null);

      // Clear any cached authentication tokens from localStorage
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.includes('origin') || key.includes('camp') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('[Wallet] Error clearing localStorage:', error);
      }

      // Additional delay before allowing reconnect
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error('[Wallet] Disconnect error:', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <div className={styles.container}>
        {showTitle && (
          <div className={styles.header}>
            <h2 className={styles.title}>Connect to CAMP Network</h2>
            <p className={styles.subtitle}>
              {wallet?.address
                ? authenticated
                  ? "Welcome back! Ready to mint NFTs"
                  : "One more step, authenticate with Origin"
                : "Please connect your wallet"}
            </p>
          </div>
        )}

        {!wallet?.address && (
          <div className={styles.authOptions}>
            <div className={styles.authOption}>
              <div className={styles.optionHeader}>
                <div className={styles.optionIcon}>🦊</div>
                <h3 className={styles.optionTitle}>Connect Wallet</h3>
              </div>
              <p className={styles.optionDescription}>
                Connect using MetaMask, WalletConnect, Coinbase, or OKX wallet
              </p>
              <button
                onClick={handleWalletConnect}
                className={styles.authButton}
              >
                🔐 Connect Wallet
              </button>
            </div>
          </div>
        )}

        {wallet?.address && !authenticated && (
          <div className={styles.authOptions}>
            <div className={styles.authOption}>
              <div className={styles.optionHeader}>
                <div className={styles.optionIcon}>✅</div>
                <h3 className={styles.optionTitle}>Wallet Connected</h3>
              </div>
              <p className={styles.optionDescription}>
                Wallet: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </p>
              <p className={styles.optionDescription}>
                Now authenticate with Origin to continue
              </p>
              <button
                onClick={handleWalletConnect}
                className={styles.authButton}
              >
                🔐 Authenticate with Origin
              </button>
            </div>
          </div>
        )}

        {authenticated && wallet?.address && (
          <div className={styles.successBox}>
            <div className={styles.successContent}>
              <div className={styles.successIcon}>✅</div>
              <div>
                <h3 className={styles.successTitle}>Connected!</h3>
                <p className={styles.successMessage}>
                  Wallet connected and authenticated with CAMP
                </p>
                <p className={styles.successMessage}>
                  Address: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </p>
                <button
                  onClick={handleDisconnect}
                  className={styles.authButton}
                  style={{ marginTop: '1rem' }}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect Origin'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals - rendered here but controlled by hooks */}
      <CampModal defaultProvider={provider} injectButton={false} />
      <ParaModal
        appName="Camp"
        oAuthMethods={[OAuthMethod.GOOGLE, OAuthMethod.TWITTER]}
        authLayout={["EXTERNAL:FULL", "AUTH:FULL"]}
        externalWallets={[
          "METAMASK",
          "WALLETCONNECT",
          "COINBASE",
          "OKX",
          "ZERION",
        ]}
        disablePhoneLogin
        recoverySecretStepEnabled
      />
    </>
  );
};

export default WalletConnection;

