'use client';

import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import Image from 'next/image';

type Wallet = {
  name: string;
  icon: string;
  onClick: () => void;
};

type WalletConnectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[]; // ✅ correct type
};

export default function WalletConnectModal({ isOpen, onClose, wallets }: WalletConnectModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white dark:bg-zinc-900 w-full max-w-md p-6 rounded-2xl shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-xl font-semibold">Select Wallet</Dialog.Title>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-zinc-500 hover:text-zinc-700 dark:hover:text-white" />
            </button>
          </div>

          <div className="flex gap-4 flex-wrap">
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={wallet.onClick}
                className="flex flex-col items-center gap-2 border border-zinc-300 dark:border-zinc-700 rounded-xl p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition w-[30%]"
              >
                <img src={wallet.icon} alt={wallet.name} width={50} height={50} />
                <span className="text-[12px] font-medium">{wallet.name}</span>
              </button>
            ))}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
