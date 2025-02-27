"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { toast } from "sonner";
import { Droplet, Coins } from "lucide-react";
import { useGetAggregatorPools, useGetPoolInfo } from "@/lib/solana";

// Helper function to format token amounts including very small values
function formatTokenAmount(amount: number): string {
  if (amount === 0) return "0";
  
  // For very small numbers, use scientific notation
  if (amount < 0.0001) {
    return amount.toExponential(4);
  }
  
  // For regular numbers, use locale string with appropriate precision
  return amount.toLocaleString(undefined, { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}

// Helper function to format percentage values
function formatPercentage(percentage: number): string {
  if (percentage === 0) return "0%";
  
  // For very small percentages, use scientific notation
  if (percentage < 0.0001) {
    return `${percentage.toExponential(4)}%`;
  }
  
  // For regular percentages, use fixed precision
  return `${percentage.toFixed(6).replace(/\.?0+$/, "")}%`;
}

function PoolStatusIcon({ type }: { type: string }) {
  switch (type) {
    case "token1":
      return <Coins className="h-5 w-5 text-blue-500" />;
    case "token2":
      return <Coins className="h-5 w-5 text-green-500" />;
    case "lp":
      return <Droplet className="h-5 w-5 text-purple-500" />;
    default:
      return null;
  }
}

export default function Aggregator() {
  const { publicKey } = useWallet();
  const { data: aggregatorPools, isLoading: isPoolsLoading } = useGetAggregatorPools();
  const [expandedPool, setExpandedPool] = useState<string | null>(null);

  // Select the first pool to display details
  const selectedPool = aggregatorPools?.[0] || null;
  const { data: poolInfo, isLoading: isPoolInfoLoading } = useGetPoolInfo(selectedPool);

  const togglePoolDetails = (poolId: string) => {
    setExpandedPool(expandedPool === poolId ? null : poolId);
  };

  const isLoading = isPoolsLoading || isPoolInfoLoading;

  if (!publicKey) {
    return (
      <div className="container mx-auto max-w-4xl py-12">
        <h1 className="mb-8 text-center text-3xl font-bold">Connect your wallet to view aggregator data</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">Liquidity Aggregator</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Aggregator Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Pools</p>
              <p className="text-2xl font-bold">{aggregatorPools?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Pools</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading liquidity pools...</div>
          ) : !aggregatorPools?.length || !poolInfo ? (
            <div className="text-center py-4 text-muted-foreground">No liquidity pools found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pool Name</TableHead>
                  <TableHead>Token 1</TableHead>
                  <TableHead>Token 2</TableHead>
                  <TableHead>LP Tokens</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aggregatorPools?.map((pool) => {
                  // Only show pools that have data
                  if (!poolInfo) return null;

                  // Calculate the name dynamically if available
                  const poolName = pool.name || 
                    `${poolInfo.token1.symbol}-${poolInfo.token2.symbol}`;

                  // Use the real aggregator LP balance from pool info
                  const lpBalance = poolInfo.aggregatorLpBalance;
                  const lpSupply = poolInfo.lpSupply;
                  
                  // Format raw values for display
                  const formattedToken1Amount = poolInfo.token1.amount / Math.pow(10, poolInfo.token1.decimals);
                  const formattedToken2Amount = poolInfo.token2.amount / Math.pow(10, poolInfo.token2.decimals);
                  const formattedLpBalance = lpBalance / Math.pow(10, poolInfo.lpDecimals);
                  const formattedLpSupply = lpSupply / Math.pow(10, poolInfo.lpDecimals);
                  
                  const sharePercentage = lpSupply > 0 ? (lpBalance / lpSupply) * 100 : 0;

                  return (
                    <>
                      <TableRow key={pool.id}>
                        <TableCell>{poolName}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <PoolStatusIcon type="token1" />
                            <span className="ml-2">
                              {formatTokenAmount(formattedToken1Amount)} {poolInfo.token1.symbol}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <PoolStatusIcon type="token2" />
                            <span className="ml-2">
                              {formatTokenAmount(formattedToken2Amount)} {poolInfo.token2.symbol}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <PoolStatusIcon type="lp" />
                            <span className="ml-2">
                              {formatTokenAmount(formattedLpBalance)} / {formatTokenAmount(formattedLpSupply)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => togglePoolDetails(pool.id)}
                          >
                            {expandedPool === pool.id ? "Hide Details" : "Show Details"}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedPool === pool.id && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <div className="bg-muted/20 p-4 rounded-md">
                              <h3 className="font-medium mb-2">Pool Details</h3>
                              <div className="grid grid-cols-2 gap-4 mb-2">
                                <div>
                                  <p className="text-sm text-muted-foreground">Pool Address</p>
                                  <p className="font-mono text-xs truncate">{pool.poolPublicKey}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Aggregator Share</p>
                                  <p>{formatPercentage(sharePercentage)}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Token 1 Mint</p>
                                  <p className="font-mono text-xs truncate">{poolInfo.token1.mint.toString()}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Token 2 Mint</p>
                                  <p className="font-mono text-xs truncate">{poolInfo.token2.mint.toString()}</p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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