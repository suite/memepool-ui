'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRightLeft } from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useState } from "react"
import { useGetTokenBalance, useVaultRequestWithdraw } from "@/lib/solana"

export default function Withdraw() {
  const { publicKey } = useWallet()
  const { data: tokenBalance, isLoading: isLoadingBalance } = useGetTokenBalance({ owner: publicKey })
  const { mutate: requestWithdraw, isPending: isRequesting } = useVaultRequestWithdraw()
  const [amount, setAmount] = useState("")

  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="mb-8 text-center text-3xl font-bold flex justify-center"><span className="whitespace-nowrap">Burn $MEME to get SOL + yield</span></h1>
      <div className="space-y-4">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <Input 
              type="number" 
              placeholder="Enter $MEME amount" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {publicKey && tokenBalance !== undefined && !isLoadingBalance && (
              <div className="mt-1 text-sm text-muted-foreground px-1">
                Balance: {tokenBalance.toFixed(4)} $MEME
              </div>
            )}
          </div>
          <ArrowRightLeft className="h-4 w-4 mt-2.5" />
          <div className="flex-1">
            <Input type="number" placeholder="SOL to receive" disabled />
            <div className="mt-1 h-5" />
          </div>
        </div>
        <Button 
          className="w-full" 
          disabled={!publicKey || isRequesting || !amount || parseFloat(amount) > (tokenBalance || 0)} 
          onClick={() => requestWithdraw({ amount: parseFloat(amount) })}
        >
          {isRequesting ? "Requesting Withdraw..." : "Request Withdraw"}
        </Button>
      </div>
    </div>
  )
}