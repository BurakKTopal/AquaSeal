import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import WalletButton from '../auth/WalletButton';
import {
  CampModal,
  useModal as useCampModal,
} from "@campnetwork/origin/react";
import {
  useModal,
  useWallet,
  OAuthMethod,
  ParaModal,
} from "@getpara/react-sdk";
import { useAccount as useWagmiAccount } from "wagmi";
import { generateProvider } from '../../utils/walletUtils';
import { useState, useEffect } from 'react';
import styles from './Navbar.module.css';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { openModal: openCampModal } = useCampModal();
  const { openModal } = useModal();
  const acc = useWagmiAccount();
  const [provider, setProvider] = useState<any>(null);
  const { data: wallet } = useWallet();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | number | undefined;
    if (wallet?.address) {
      timeoutId = setTimeout(async () => {
        const newProvider = await generateProvider(acc);
        setProvider(newProvider);
      }, 200);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [acc, wallet?.address]);

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.container}>
          <Link to="/" className={styles.logo}>
            <img src="/logo.svg" alt="AquaSeal" style={{ height: '32px', marginRight: '8px' }} />
            AquaSeal
          </Link>
          
          <div className={styles.links}>
            <Link 
              to="/" 
              className={`${styles.link} ${location.pathname === '/' ? styles.active : ''}`}
            >
              Upload
            </Link>
            <Link 
              to="/verify" 
              className={`${styles.link} ${location.pathname === '/verify' ? styles.active : ''}`}
            >
              Verify
            </Link>
            <Link 
              to="/developer" 
              className={`${styles.link} ${location.pathname === '/developer' ? styles.active : ''}`}
            >
              Developer
            </Link>
          </div>

          <div className={styles.wallet}>
            <WalletButton />
          </div>
        </div>
      </nav>
      
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

export default Navbar;

