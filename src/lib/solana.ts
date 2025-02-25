import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useMemo } from "react";
import type { Memepool } from "./types/memepool";
import IDL from "./idl/memepool.json";
import { getPortfolioAccount, getPortfolioCounter, getUserWithdrawRequests, getWithdrawRequestAccount } from "./memepool-utils";

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