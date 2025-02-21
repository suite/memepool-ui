'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRightLeft } from "lucide-react"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { useEffect, useState } from "react"

export default function Home() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState<number | null>(null)
  const [amount, setAmount] = useState("")

  useEffect(() => {
    if (!publicKey) {
      setBalance(null)
      return
    }

    connection.getBalance(publicKey).then(bal => {
      setBalance(bal / LAMPORTS_PER_SOL)
    })
  }, [publicKey, connection])

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
            {publicKey && balance !== null && (
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
        <Button className="w-full">Deposit SOL</Button>
      </div>
    </div>
  )
}
