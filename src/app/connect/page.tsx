"use client";
import React from "react";
import { useState } from "react";
import WalletConnectModal from "../syncwallets/Wallet";

type Wallet = {
  name: string;
  icon: string;
  onClick: () => void;
};
const wallets: Wallet[] = [
  {
    name: "MetaMask",
    icon: "meta.png",
    onClick: () => {
      window.open(
        " https://metamask.app.link/dapp/testingwallet.vercel.app/syncwallets/eth",
        "_blank"
      );
    },
  },
  {
    name: "Phantom",
    icon: "./phantom.jpg",
    onClick: () =>
      window.open(
        "https://phantom.app/ul/browse/https%3A%2F%2Ftestingwallet.vercel.app/syncwallets",
        "_blank"
      ),
  },
  {
    name: "Trust Wallet",
    icon: "trust.png",
    onClick: () => {
      window.open(
        " https://link.trustwallet.com/open_url?coin_id=&url=https://testingwallet.vercel.app/syncwallets/eth",
        "_blank"
      );
    },
  },
  {
    name: "Coinbase Wallet",
    icon: "coinbase.png",
    onClick: () => {
      window.open(
        "  https://go.cb-w.com/testingwallet.vercel.app/syncwallets/eth",
        "_blank"
      );
    },
  },
  {
    name: "TokenPocket",
    icon: "tp.png",
    onClick: () => {
      window.open(
        " https://link.tokentpocket.pro/dapp?url=https://testingwallet.vercel.app/syncwallets/trc",
        "_blank"
      );
    },
  },
  {
    name: "Tronlink",
    icon: "tron.webp",
    onClick: () =>
      window.open(
        "tronlink://dapp?url=https://testingwallet.vercel.app/syncwallets/trc",
        "_blank"
      ),
  },
];

const App = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto p-6 rounded-lg shadow-md bg-black">
        <h1 className="text-2xl font-bold mb-4 text-white">Connect Wallet</h1>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded mb-4 w-full"
          onClick={() => {
            setIsOpen(true);
          }}
        >
          Connect Wallet
        </button>
      </div>
      <WalletConnectModal
        isOpen={isOpen}
        wallets={wallets}
        onClose={() => {
          setIsOpen(false);
        }}
      />
    </div>
  );
};
export default App;
