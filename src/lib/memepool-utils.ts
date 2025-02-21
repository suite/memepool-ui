import { PublicKey, GetProgramAccountsFilter } from "@solana/web3.js";
import { BN, Program } from "@coral-xyz/anchor";
import type { Memepool } from "./types/memepool";

export const getPortfolioAccount = (user: PublicKey, programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("portfolio"), user.toBuffer()], 
    programId
  )[0];
};

export const getPortfolioCounter = async (portfolio: PublicKey, program: Program<Memepool>): Promise<BN> => {
  let counter: BN = new BN(0);
  try {
    const portfolioAccount = await program.account.portfolio.fetch(portfolio);
    counter = portfolioAccount.counter;
  } catch (err) {
    // If portfolio doesn't exist yet, counter starts at 0
  }
  return counter;
};

export const getWithdrawRequestAccount = (user: PublicKey, counter: BN, programId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("withdraw_request"), 
      user.toBuffer(), 
      counter.toArrayLike(Buffer, "le", 8)
    ], 
    programId
  )[0];
};

export type WithdrawRequest = {
  user: PublicKey;
  bump: number;
  status: number;
  memeAmt: BN;
  count: BN;
};

export const getUserWithdrawRequests = async (
  program: Program<Memepool>,
  userPubkey: PublicKey
): Promise<WithdrawRequest[]> => {
  // Calculate exact data size for WithdrawRequest:
  // Pubkey (32) + bump (1) + status (1) + meme_amt (8) + count (8) + discriminator (8) = 58 bytes
  const dataSize = 32 + 1 + 1 + 8 + 8 + 8;

  const filters: GetProgramAccountsFilter[] = [
    {
      dataSize: dataSize, // Exact data size filter
    },
    {
      memcmp: {
        offset: 8, // Skip account discriminator (8 bytes)
        bytes: userPubkey.toBase58(), // Filter by user's public key
      },
    },
  ];

  try {
    const accounts = await program.account.withdrawRequest.all(filters);

    return accounts.map(({ account }) => ({
      user: account.user,
      bump: account.bump,
      status: account.status,
      memeAmt: account.memeAmt,
      count: account.count,
    }));
  } catch (error) {
    console.error("Error fetching withdraw requests:", error);
    return [];
  }
}; 