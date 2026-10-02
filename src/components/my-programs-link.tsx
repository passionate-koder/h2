"use client";
import Link from "next/link";
import { useAccount } from "./account-provider";
import type { ReactNode } from "react";
export function MyProgramsLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { user } = useAccount();
  return (
    <Link
      href={user ? "/my-events" : "/auth?redirect=/my-events"}
      className={className}
    >
      {children}
    </Link>
  );
}
