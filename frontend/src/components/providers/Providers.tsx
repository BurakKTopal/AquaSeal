import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Environment, ParaProvider } from "@getpara/react-sdk";
import {
    metaMaskWallet,
    walletConnectWallet,
    ParaEvmProvider,
    coinbaseWallet,
    okxWallet,
} from "@getpara/evm-wallet-connectors";
import { CampProvider } from "@campnetwork/origin/react";
import { testnet } from "../../utils/chain";
import "@getpara/react-sdk/styles.css";

const queryClient = new QueryClient();

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    const originClientId = import.meta.env.VITE_ORIGIN_CLIENT_ID || "";
    const paraApiKey = import.meta.env.VITE_PARA_API_KEY || "";
    const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

    // Para API key is optional - only needed for on-ramp features
    // External wallet connection works without it
    // Pass empty string if not provided - SDK will handle gracefully
    const paraConfig = {
        env: Environment.PRODUCTION,
        apiKey: paraApiKey || "",
        opts: {
            externalWalletConnectionOnly: true,
        },
    };

    return (
        <QueryClientProvider client={queryClient}>
            <CampProvider clientId={originClientId}>
                <ParaProvider paraClientConfig={paraConfig}>
                    <ParaEvmProvider
                        config={{
                            projectId: projectId,
                            appName: "Camp",
                            chains: [testnet],
                            wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet, okxWallet],
                        }}
                    >
                        {children}
                    </ParaEvmProvider>
                </ParaProvider>
            </CampProvider>
        </QueryClientProvider>
    );
}
