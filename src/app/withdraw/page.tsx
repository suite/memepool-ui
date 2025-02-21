import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRightLeft } from "lucide-react"

export default function Withdraw() {
  return (
    <div className="container mx-auto max-w-md py-12">
      <h1 className="mb-8 text-center text-3xl font-bold flex justify-center"><span className="whitespace-nowrap">Burn $MEME to get SOL + yield</span></h1>
      <div className="space-y-4">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <Input type="number" placeholder="Enter $MEME amount" />
          </div>
          <ArrowRightLeft className="h-4 w-4 mt-2.5" />
          <div className="flex-1">
            <Input type="number" placeholder="SOL + yield to receive" disabled />
          </div>
        </div>
        <Button className="w-full">Open Withdraw Request</Button>
      </div>
    </div>
  )
}