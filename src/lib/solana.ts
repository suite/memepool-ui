import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useMemo } from "react";
import type { Memepool } from "./types/memepool";
import IDL from "./idl/memepool.json";
import { getPortfolioAccount, getPortfolioCounter, getWithdrawRequestAccount } from "./memepool-utils";

const PROGRAM_ID = new PublicKey(IDL.address);
const MEME_TOKEN_MINT = new PublicKey("6fARp4wWDXoRK2To7mamqo2GwY3UYbTd3W9xhRmq6Q9z");

type VaultDepositAccounts = {
  depositer: PublicKey;
  vault: PublicKey;
  memeMint: PublicKey;
  depositerMemeAta: PublicKey;
  systemProgram: PublicKey;
  tokenProgram: PublicKey;
  associatedTokenProgram: PublicKey;
}

type VaultRequestWithdrawAccounts = {
  withdrawer: PublicKey;
  vault: PublicKey;
  memeMint: PublicKey;
  withdrawerMemeAta: PublicKey;
  portfolio: PublicKey;
  withdrawRequest: PublicKey;
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
  };
}

export function useVaultRequestWithdraw() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { program, vault, memeMint } = useAnchorProgram();

  return useMutation({
    mutationFn: async (params: { amount: number }) => {
      if (!publicKey || !program) throw new Error("Wallet not connected");

      const withdrawerMemeAta = getAssociatedTokenAddressSync(memeMint, publicKey);
      const withdraw = new BN(params.amount * Math.pow(10, 9));
      
      // Get Portfolio and Withdraw Request PDAs
      const portfolio = getPortfolioAccount(publicKey, program.programId);
      const counter = await getPortfolioCounter(portfolio, program);
      const withdrawRequest = getWithdrawRequestAccount(publicKey, counter, program.programId);

      const accounts: VaultRequestWithdrawAccounts = {
        withdrawer: publicKey,
        vault,
        memeMint,
        withdrawerMemeAta,
        portfolio,
        withdrawRequest,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
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
  const { program, vault, memeMint } = useAnchorProgram();

  return useMutation({
    mutationFn: async (params: { amount: number }) => {
      if (!publicKey || !program) throw new Error("Wallet not connected");

      const depositerMemeAta = getAssociatedTokenAddressSync(memeMint, publicKey);
      const deposit = new BN(params.amount * LAMPORTS_PER_SOL);

      const accounts: VaultDepositAccounts = {
        depositer: publicKey,
        vault,
        memeMint,
        depositerMemeAta,
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

  return useQuery({
    queryKey: ["get-token-balance", { endpoint: connection.rpcEndpoint, owner: owner?.toBase58() }],
    queryFn: async () => {
      if (!owner) throw new Error("No owner address provided");
      const ata = getAssociatedTokenAddressSync(MEME_TOKEN_MINT, owner);
      
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