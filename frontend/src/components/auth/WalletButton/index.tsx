import React from 'react';
import {
  useAuthState,
  useConnect,
  useModal as useCampModal,
} from "@campnetwork/origin/react";
import {
  useModal,
  useWallet,
} from "@getpara/react-sdk";
import { useDisconnect as useWagmiDisconnect } from "wagmi";
import { useState } from 'react';
import styles from './WalletButton.module.css';

const WalletButton: React.FC = () => {
  const { authenticated } = useAuthState();
  const { disconnect: disconnectOrigin } = useConnect();
  const { openModal: openCampModal } = useCampModal();
  const { data: wallet } = useWallet();
  const { openModal } = useModal();
  const { disconnect: disconnectWagmi } = useWagmiDisconnect();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleClick = () => {
    if (!wallet?.address) {
      openModal();
    } else if (!authenticated) {
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

  if (authenticated && wallet?.address) {
    return (
      <div className={styles.connected}>
        <div className={styles.address}>
          {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
        </div>
        <button
          onClick={handleDisconnect}
          className={styles.disconnectBtn}
          disabled={isDisconnecting}
        >
          {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    );
  }

  return (
    <button onClick={handleClick} className={styles.connectBtn} disabled={isDisconnecting}>
      {wallet?.address ? 'Authenticate' : 'Connect Wallet'}
    </button>
  );
};

export default WalletButton;

