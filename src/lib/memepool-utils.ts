import { PublicKey } from "@solana/web3.js"
import { BN, Program } from "@coral-xyz/anchor"
import type { Memepool } from "./types/memepool"

export const getPortfolioAccount = (user: PublicKey, programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("portfolio"), user.toBuffer()], 
    programId
  )[0]
}

export const getPortfolioCounter = async (portfolio: PublicKey, program: Program<Memepool>): Promise<BN> => {
  let counter: BN = new BN(0)
  try {
    const portfolioAccount = await program.account.portfolio.fetch(portfolio)
    counter = portfolioAccount.counter
  } catch (err) {
    // If portfolio doesn't exist yet, counter starts at 0
  }
  return counter
}

export const getWithdrawRequestAccount = (user: PublicKey, counter: BN, programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("withdraw_request"), 
      user.toBuffer(), 
      counter.toArrayLike(Buffer, "le", 8)
    ], 
    programId
  )[0]
} 