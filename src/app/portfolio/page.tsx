"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, Clock, ArrowDownCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGetWithdrawRequests, useGetTokenBalance, useVaultFinalizeWithdraw } from "@/lib/solana";
import { toast } from "sonner";
import { useState } from "react";

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "ready":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "pending":
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case "claimed":
      return <ArrowDownCircle className="h-5 w-5 text-blue-500" />;
    default:
      return null;
  }
}

export default function Portfolio() {
  const { publicKey } = useWallet();
  const { data: withdrawRequests, isLoading, refetch } = useGetWithdrawRequests();
  const { data: tokenBalance } = useGetTokenBalance({ owner: publicKey });
  const finalizeWithdraw = useVaultFinalizeWithdraw();
  const [claimingIds, setClaimingIds] = useState<string[]>([]);

  const handleClaim = async (counter: number) => {
    const id = counter.toString();
    try {
      setClaimingIds(prev => [...prev, id]);
      toast.promise(
        finalizeWithdraw.mutateAsync({ counter }),
        {
          loading: "Confirming transaction...",
          success: () => {
            refetch();
            return "Successfully claimed withdraw request";
          },
          error: "Failed to claim withdraw request"
        }
      );
    } catch (error) {
      console.error("Failed to claim:", error);
    } finally {
      setClaimingIds(prev => prev.filter(claimId => claimId !== id));
    }
  };

  if (!publicKey) {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <h1 className="mb-8 text-center text-3xl font-bold">Connect your wallet to view portfolio</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">Your Portfolio</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">$MEME Balance</p>
              <p className="text-2xl font-bold">{tokenBalance?.toFixed(4) || "0"} $MEME</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated SOL Value</p>
              <p className="text-2xl font-bold">Coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Withdraw Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading withdraw requests...</div>
          ) : withdrawRequests?.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No withdraw requests found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>SOL + Yield</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawRequests?.map((request) => {
                  const isClaimingThis = claimingIds.includes(request.count.toString());
                  return (
                    <TableRow key={request.count.toString()}>
                      <TableCell>
                        <div className="flex items-center">
                          <StatusIcon status={request.status === 0 ? "pending" : "ready"} />
                          <span className="ml-2 capitalize">{request.status === 0 ? "pending" : "ready"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{(Number(request.memeAmt) / Math.pow(10, 9)).toFixed(4)} $MEME</TableCell>
                      <TableCell>Coming soon</TableCell>
                      <TableCell>
                        <div className={request.status !== 1 ? "cursor-not-allowed" : ""}>
                          <Button 
                            size="sm" 
                            disabled={request.status !== 1 || isClaimingThis} 
                            onClick={() => handleClaim(request.count.toNumber())}
                          >
                            {isClaimingThis ? "Claiming..." : "Claim"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 