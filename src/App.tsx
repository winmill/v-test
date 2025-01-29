import reactLogo from "/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { arbitrum, arbitrumSepolia } from "@reown/appkit/networks";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitState,
} from "@reown/appkit/react";

import VertexWallet from "./VertexWallet";

// 1. Get projectId
const projectId = import.meta.env.VITE_WALLET_CONNECT;

// 2. Set the networks

// 3. Create a metadata object - optional
const metadata = {
  name: "My Website",
  description: "My Website description",
  url: "https://mywebsite.com", // origin must match your domain & subdomain
  icons: ["https://avatars.mywebsite.com/"],
};

// Create Ethers adapter
const ethersAdapter = new EthersAdapter();

// 4. Create a AppKit instance
createAppKit({
  adapters: [ethersAdapter],
  networks: [arbitrum, arbitrumSepolia],
  defaultNetwork: arbitrumSepolia,
  metadata,
  projectId,
  features: {
    email: false,
    socials: [],
    emailShowWallets: false,
    // legalCheckbox: true,
    onramp: false,
    swaps: false,
    analytics: true,
    send: false,
    history: false,
  },
});

function App() {
  const { open } = useAppKit();
  const { address, status } = useAppKitAccount();
  const { selectedNetworkId } = useAppKitState();

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <div className="card">
        <button style={{ marginLeft: "1em" }} onClick={() => open()}>
          Connect
        </button>
        <button
          style={{ marginLeft: "1em" }}
          onClick={() => open({ view: "Networks" })}
        >
          Choose Network
        </button>
      </div>
      <div>connected: {status}</div>
      <div>address: {address}</div>
      <div>network: {selectedNetworkId}</div>
      <div>
        <VertexWallet />
      </div>
    </>
  );
}

export default App;
