"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export type AccountMenuShopper = {
  name: string;
  email: string;
  image?: string | null;
};

export function AccountMenu({ shopper }: { shopper: AccountMenuShopper }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const menuId = useId();
  const initials = shopper.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menuRef.current?.contains(event.target) &&
        !triggerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="account-menu">
      <button
        ref={triggerRef}
        className="account-trigger"
        type="button"
        aria-label={`Open account menu for ${shopper.name}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {shopper.image ? (
          // The image is optional profile decoration; the trigger remains labelled with the shopper name.
          <img className="account-avatar" src={shopper.image} alt="" />
        ) : (
          <span className="account-avatar account-avatar-initials" aria-hidden="true">
            {initials || "V"}
          </span>
        )}
      </button>
      {open ? (
        <div ref={menuRef} id={menuId} className="account-dropdown" role="menu" aria-label="Account menu">
          <div className="account-summary">
            <strong>{shopper.name}</strong>
            <span>{shopper.email}</span>
          </div>
          <div className="account-menu-links">
            <Link ref={firstItemRef} href="/account" role="menuitem" onClick={() => setOpen(false)}>
              Your account
            </Link>
            <Link href="/orders" role="menuitem" onClick={() => setOpen(false)}>
              Your orders
            </Link>
            <Link href="/help" role="menuitem" onClick={() => setOpen(false)}>
              Help and support
            </Link>
          </div>
          <button
            className="account-sign-out"
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await fetch("/api/auth/sign-out", { method: "POST" });
              window.location.assign("/");
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
