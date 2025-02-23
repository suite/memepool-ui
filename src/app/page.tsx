"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRightLeft } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { useGetBalance, useVaultDeposit } from "@/lib/solana";
import { toast } from "sonner";

export default function Home() {
  const { publicKey } = useWallet();
  const { data: balance, isLoading: isLoadingBalance } = useGetBalance({ address: publicKey });
  const { mutateAsync: deposit, isPending: isDepositing } = useVaultDeposit();
  const [amount, setAmount] = useState("");

  const handleDeposit = async () => {
    try {
      toast.promise(
        deposit({ amount: parseFloat(amount) }),
        {
          loading: "Confirming transaction...",
          success: () => {
            setAmount("");
            return "Successfully deposited SOL";
          },
          error: "Failed to deposit SOL"
        }
      );
    } catch (error) {
      console.error("Failed to deposit:", error);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">Deposit SOL to get $MEME</h1>
      <div className="space-y-4">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <Input 
              type="number" 
              placeholder="Enter SOL amount" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {publicKey && balance !== undefined && !isLoadingBalance && (
              <div className="mt-1 text-sm text-muted-foreground px-1">
                Balance: {balance.toFixed(4)} SOL
              </div>
            )}
          </div>
          <ArrowRightLeft className="h-4 w-4 mt-2.5" />
          <div className="flex-1">
            <Input type="number" placeholder="$MEME to receive" disabled />
            <div className="mt-1 h-5" />
          </div>
        </div>
        <Button 
          className="w-full" 
          disabled={!publicKey || isDepositing || !amount} 
          onClick={handleDeposit}
        >
          {isDepositing ? "Depositing..." : "Deposit SOL"}
        </Button>
      </div>
    </div>
  );
}
