import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useMemo } from "react";
import type { Memepool } from "./types/memepool";
import IDL from "./idl/memepool.json";
import { getPortfolioAccount, getPortfolioCounter, getUserWithdrawRequests, getWithdrawRequestAccount } from "./memepool-utils";
import { Raydium } from "@raydium-io/raydium-sdk-v2";

const PROGRAM_ID = new PublicKey(IDL.address);

type VaultDepositAccounts = {
  depositer: PublicKey;
  vault: PublicKey;
  memeMint: PublicKey;
  wsolMint: PublicKey;
  depositerMemeAta: PublicKey;
  vaultWsolAta: PublicKey;
  systemProgram: PublicKey;
  tokenProgram: PublicKey;
  associatedTokenProgram: PublicKey;
}

type VaultRequestWithdrawAccounts = {
  withdrawer: PublicKey;
  vault: PublicKey;
  memeMint: PublicKey;
  wsolMint: PublicKey;
  withdrawerMemeAta: PublicKey;
  portfolio: PublicKey;
  withdrawRequest: PublicKey;
  withdrawRequestMemeAta: PublicKey;
  vaultWsolAta: PublicKey;
  tempVaultWsolAta: PublicKey;
  systemProgram: PublicKey;
  tokenProgram: PublicKey;
  associatedTokenProgram: PublicKey;
}

type VaultFinalizeWithdrawAccounts = {
  withdrawer: PublicKey;
  withdrawRequest: PublicKey;
  memeMint: PublicKey;
  vault: PublicKey;
  withdrawRequestMemeAta: PublicKey;
  systemProgram: PublicKey;
  tokenProgram: PublicKey;
}

export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Derive PDAs
  const vault = useMemo(() => 
    PublicKey.findProgramAddressSync([Buffer.from("vault")], PROGRAM_ID)[0], 
    []
  );
  
  const memeMint = useMemo(() => 
    PublicKey.findProgramAddressSync([Buffer.from("meme")], PROGRAM_ID)[0],
    []
  );

  const wsolMint = useMemo(() => 
    new PublicKey("So11111111111111111111111111111111111111112"),
    []
  );

  // Create AnchorProvider and Program instances
  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    return new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions!,
      },
      AnchorProvider.defaultOptions()
    );
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(
      { ...IDL, address: PROGRAM_ID.toBase58() } as Memepool,
      provider
    );
  }, [provider]);

  return {
    program,
    vault,
    memeMint,
    wsolMint,
  };
}

export function useVaultRequestWithdraw() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { program, vault, memeMint, wsolMint } = useAnchorProgram();

  return useMutation({
    mutationFn: async (params: { amount: number }) => {
      if (!publicKey || !program) throw new Error("Wallet not connected");

      const withdrawerMemeAta = getAssociatedTokenAddressSync(memeMint, publicKey);
      const withdraw = new BN(params.amount * Math.pow(10, 9));
      
      // Get Portfolio and Withdraw Request PDAs
      const portfolio = getPortfolioAccount(publicKey, program.programId);
      const counter = await getPortfolioCounter(portfolio, program);
      const withdrawRequest = getWithdrawRequestAccount(publicKey, counter, program.programId);
      const withdrawRequestMemeAta = getAssociatedTokenAddressSync(memeMint, withdrawRequest, true);
      const vaultWsolAta = getAssociatedTokenAddressSync(wsolMint, vault, true);
      const tempVaultWsolAta = getAssociatedTokenAddressSync(wsolMint, withdrawRequest, true);

      const accounts: VaultRequestWithdrawAccounts = {
        withdrawer: publicKey,
        vault,
        memeMint,
        wsolMint,
        withdrawerMemeAta,
        portfolio,
        withdrawRequest,
        withdrawRequestMemeAta,
        vaultWsolAta,
        tempVaultWsolAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      };

      const tx = await program.methods
        .vaultRequestWithdraw(withdraw)
        .accounts(accounts)
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);
      
      return signature;
    }
  });
}

export function useVaultDeposit() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { program, vault, memeMint, wsolMint } = useAnchorProgram();

  return useMutation({
    mutationFn: async (params: { amount: number }) => {
      if (!publicKey || !program) throw new Error("Wallet not connected");

      const vaultWsolAta = getAssociatedTokenAddressSync(wsolMint, vault, true);
      const depositerMemeAta = getAssociatedTokenAddressSync(memeMint, publicKey);
      const deposit = new BN(params.amount * LAMPORTS_PER_SOL);

      const accounts: VaultDepositAccounts = {
        depositer: publicKey,
        vault,
        memeMint,
        wsolMint,
        depositerMemeAta,
        vaultWsolAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      };

      const tx = await program.methods
        .vaultDeposit(deposit)
        .accounts(accounts)
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);
      
      return signature;
    }
  });
}

export function useGetBalance({ address }: { address: PublicKey | null }) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["get-balance", { endpoint: connection.rpcEndpoint, address: address?.toBase58() }],
    queryFn: async () => {
      if (!address) throw new Error("No address provided");
      const lamports = await connection.getBalance(address);
      return lamports / LAMPORTS_PER_SOL;
    },
    enabled: !!address
  });
}

export function useGetTokenBalance({ owner }: { owner: PublicKey | null }) {
  const { connection } = useConnection();
  const { memeMint } = useAnchorProgram();

  return useQuery({
    queryKey: ["get-token-balance", { endpoint: connection.rpcEndpoint, owner: owner?.toBase58() }],
    queryFn: async () => {
      if (!owner) throw new Error("No owner address provided");
      const ata = getAssociatedTokenAddressSync(memeMint, owner);
      
      try {
        const balance = await connection.getTokenAccountBalance(ata);
        return parseFloat(balance.value.amount) / Math.pow(10, balance.value.decimals);
      } catch (e) {
        // If the token account doesn't exist yet, return 0
        return 0;
      }
    },
    enabled: !!owner
  });
}

export function useGetWithdrawRequests() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();

  return useQuery({
    queryKey: ["withdraw-requests", { user: publicKey?.toBase58() }],
    queryFn: async () => {
      if (!publicKey || !program) throw new Error("Wallet not connected");
      return getUserWithdrawRequests(program, publicKey);
    },
    enabled: !!publicKey && !!program,
  });
}

export function useVaultFinalizeWithdraw() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { program, vault, memeMint } = useAnchorProgram();

  return useMutation({
    mutationFn: async (params: { counter: number }) => {
      if (!publicKey || !program) throw new Error("Wallet not connected");

      const withdrawRequest = getWithdrawRequestAccount(publicKey, new BN(params.counter), program.programId);
      const withdrawRequestMemeAta = getAssociatedTokenAddressSync(memeMint, withdrawRequest, true);

      const accounts: VaultFinalizeWithdrawAccounts = {
        withdrawer: publicKey,
        withdrawRequest,
        memeMint,
        vault,
        withdrawRequestMemeAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      };

      const tx = await program.methods
        .vaultFinalizeWithdraw()
        .accounts(accounts)
        .transaction();

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature);
      
      return signature;
    }
  });
}

export function useRaydiumSdk() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["raydium-sdk", { endpoint: connection.rpcEndpoint }],
    queryFn: async () => {
      const cluster = connection.rpcEndpoint.includes("devnet") ? "devnet" : "mainnet";
      
      const raydium = await Raydium.load({
        connection,
        cluster,
        owner: publicKey || undefined,
        disableFeatureCheck: true,
        blockhashCommitment: "finalized",
      });

      return raydium;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useGetPoolInfo(pool: { 
  id: string; 
  name: string; 
  mintA: string; 
  mintB: string; 
  poolPublicKey: string; 
} | null) {
  const { connection } = useConnection();
  const { data: raydium, isLoading: isRaydiumLoading } = useRaydiumSdk();
  const { vault } = useAnchorProgram();

  return useQuery({
    queryKey: ["pool-info", { poolAddress: pool?.poolPublicKey, endpoint: connection.rpcEndpoint }],
    queryFn: async () => {
      if (!pool || !raydium) throw new Error("Pool data or Raydium SDK not available");
      
      try {
        // Get pool information from Raydium SDK
        const poolInfo = await raydium.cpmm.getRpcPoolInfo(pool.poolPublicKey);

        // Get mint addresses as PublicKeys directly
        const mintA = poolInfo.mintA;
        const mintB = poolInfo.mintB;
        const mintLp = poolInfo.mintLp;
        
        const tokenASymbol = pool.mintA;
        const tokenBSymbol = pool.mintB;
        const tokenADecimals = poolInfo.mintDecimalA;
        const tokenBDecimals = poolInfo.mintDecimalB;
        const lpDecimals = poolInfo.lpDecimals;
        
        // Extract amount values safely
        const tokenAAmount = Number(poolInfo.vaultAAmount.toString());
        const tokenBAmount = Number(poolInfo.vaultBAmount.toString());
        const lpSupply = Number(poolInfo.lpAmount.toString());

        // Log pool balances for debugging
        console.log("Pool balances:", {
          poolId: pool.id,
          tokenA: {
            symbol: tokenASymbol,
            amount: tokenAAmount,
            decimals: tokenADecimals,
            formatted: tokenAAmount / Math.pow(10, tokenADecimals)
          },
          tokenB: {
            symbol: tokenBSymbol, 
            amount: tokenBAmount,
            decimals: tokenBDecimals,
            formatted: tokenBAmount / Math.pow(10, tokenBDecimals)
          }
        });
        
        // Get the aggregator's LP balance
        let aggregatorLpBalance = 0;
        try {
          // Create ATA for vault and LP mint
          const vaultLpAta = getAssociatedTokenAddressSync(
            mintLp,
            vault,
            true
          );
          
          // Get token balance
          const balanceResponse = await connection.getTokenAccountBalance(vaultLpAta);
          aggregatorLpBalance = Number(balanceResponse.value.amount);
        } catch (error) {
          console.warn("Failed to fetch aggregator LP balance:", error);
        }
        
        return {
          poolAddress: pool.poolPublicKey,
          token1: {
            mint: mintA,
            symbol: tokenASymbol,
            amount: tokenAAmount,
            decimals: tokenADecimals,
          },
          token2: {
            mint: mintB,
            symbol: tokenBSymbol,
            amount: tokenBAmount,
            decimals: tokenBDecimals,
          },
          lpSupply,
          lpMint: mintLp,
          lpDecimals,
          aggregatorLpBalance,
        };
      } catch (error) {
        console.error("Error fetching pool info:", error);
        throw new Error(`Failed to fetch pool info: ${String(error)}`);
      }
    },
    enabled: !!pool && !!raydium && !isRaydiumLoading,
  });
}

export function useGetAggregatorPools() {
  // hard code for now
  return useQuery({
    queryKey: ["aggregator-pools"],
    queryFn: async () => {
      return [
        {
          id: "1",
          name: "WSOL-MEMEPOOLTEST",
          mintA: "WSOL",
          mintB: "MEMEPOOLTEST",
          poolPublicKey: "2zQi1M8QrJpXxLWNyBuec3N7hNG1x7DmChctYYeE5HLT",
        }
      ];
    },
  });
} 