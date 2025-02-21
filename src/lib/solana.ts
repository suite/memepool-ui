import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js"
import { useQuery, useMutation } from "@tanstack/react-query"
import { BN, Program, AnchorProvider } from "@coral-xyz/anchor"
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { useMemo } from "react"
import type { Memepool } from "./types/memepool"
import IDL from "./idl/memepool.json"

const PROGRAM_ID = new PublicKey(IDL.address)

type VaultDepositAccounts = {
  depositer: PublicKey;
  vault: PublicKey;
  memeMint: PublicKey;
  depositerMemeAta: PublicKey;
  systemProgram: PublicKey;
  tokenProgram: PublicKey;
  associatedTokenProgram: PublicKey;
}

export function useAnchorProgram() {
  const { connection } = useConnection()
  const wallet = useWallet()

  // Derive PDAs
  const vault = useMemo(() => 
    PublicKey.findProgramAddressSync([Buffer.from("vault")], PROGRAM_ID)[0], 
    []
  )
  
  const memeMint = useMemo(() => 
    PublicKey.findProgramAddressSync([Buffer.from("meme")], PROGRAM_ID)[0],
    []
  )

  // Create AnchorProvider and Program instances
  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null
    return new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions!,
      },
      AnchorProvider.defaultOptions()
    )
  }, [connection, wallet])

  const program = useMemo(() => {
    if (!provider) return null
    return new Program(
      { ...IDL, address: PROGRAM_ID.toBase58() } as Memepool,
      provider
    )
  }, [provider])

  return {
    program,
    vault,
    memeMint,
  }
}

export function useVaultDeposit() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const { program, vault, memeMint } = useAnchorProgram()

  return useMutation({
    mutationFn: async (params: { amount: number }) => {
      if (!publicKey || !program) throw new Error("Wallet not connected")

      const depositerMemeAta = getAssociatedTokenAddressSync(memeMint, publicKey)
      const deposit = new BN(params.amount * LAMPORTS_PER_SOL)

      const accounts: VaultDepositAccounts = {
        depositer: publicKey,
        vault,
        memeMint,
        depositerMemeAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      }

      const tx = await program.methods
        .vaultDeposit(deposit)
        .accounts(accounts)
        .transaction()

      const signature = await sendTransaction(tx, connection)
      await connection.confirmTransaction(signature)
      
      return signature
    }
  })
}

export function useGetBalance({ address }: { address: PublicKey | null }) {
  const { connection } = useConnection()

  return useQuery({
    queryKey: ['get-balance', { endpoint: connection.rpcEndpoint, address: address?.toBase58() }],
    queryFn: async () => {
      if (!address) throw new Error('No address provided')
      const lamports = await connection.getBalance(address)
      return lamports / LAMPORTS_PER_SOL
    },
    enabled: !!address
  })
} 