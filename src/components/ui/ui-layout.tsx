"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import * as React from "react";
import {ReactNode, Suspense, useEffect, useRef} from "react";
import { Toaster, toast } from "sonner";

import {ExplorerLink} from "../cluster/cluster-ui";
import {WalletButton} from "../solana/solana-provider";

export function UiLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 sticky top-0 z-50 w-full border-b backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">memepool</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/" className={pathname === "/" ? "text-foreground" : "text-foreground/60"}>
              Deposit
            </Link>
            <Link href="/withdraw" className={pathname === "/withdraw" ? "text-foreground" : "text-foreground/60"}>
              Withdraw
            </Link>
            <Link href="/portfolio" className={pathname === "/portfolio" ? "text-foreground" : "text-foreground/60"}>
              Portfolio
            </Link>
            <Link href="/aggregator" className={pathname === "/aggregator" ? "text-foreground" : "text-foreground/60"}>
              Aggregator
            </Link>
          </nav>
          <div className="ml-auto">
            <WalletButton />
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Suspense
          fallback={
            <div className="text-center my-32">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          }
        >
          {children}
        </Suspense>
        <Toaster position="bottom-right" />
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            <a href="https://github.com/suite/memepool" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground/80">
              <svg height="20" width="20" aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function AppModal({
  children,
  title,
  hide,
  show,
  submit,
  submitDisabled,
  submitLabel,
}: {
  children: ReactNode
  title: string
  hide: () => void
  show: boolean
  submit?: () => void
  submitDisabled?: boolean
  submitLabel?: string
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (!dialogRef.current) return;
    if (show) {
      dialogRef.current.showModal();
    } else {
      dialogRef.current.close();
    }
  }, [show, dialogRef]);

  return (
    <dialog className="modal" ref={dialogRef}>
      <div className="modal-box space-y-5">
        <h3 className="font-bold text-lg">{title}</h3>
        {children}
        <div className="modal-action">
          <div className="join space-x-2">
            {submit ? (
              <button className="btn btn-xs lg:btn-md btn-primary" onClick={submit} disabled={submitDisabled}>
                {submitLabel || "Save"}
              </button>
            ) : null}
            <button onClick={hide} className="btn">
              Close
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

export function AppHero({
  children,
  title,
  subtitle,
}: {
  children?: ReactNode
  title: ReactNode
  subtitle: ReactNode
}) {
  return (
    <div className="hero py-[64px]">
      <div className="hero-content text-center">
        <div className="max-w-2xl">
          {typeof title === "string" ? <h1 className="text-5xl font-bold">{title}</h1> : title}
          {typeof subtitle === "string" ? <p className="py-6">{subtitle}</p> : subtitle}
          {children}
        </div>
      </div>
    </div>
  );
}

export function ellipsify(str = "", len = 4) {
  if (str.length > 30) {
    return str.substring(0, len) + ".." + str.substring(str.length - len, str.length);
  }
  return str;
}

export function useTransactionToast() {
  return (signature: string) => {
    toast.success("Transaction sent", {
      description: (
        <ExplorerLink path={`tx/${signature}`} label={"View Transaction"} className="btn btn-xs btn-primary" />
      ),
      duration: 4000,
    });
  };
}
