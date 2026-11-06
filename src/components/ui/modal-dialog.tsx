"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  lightDismiss?: boolean;
}

export function ModalDialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  lightDismiss = true,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };

    dialog.addEventListener("close", handleClose);

    // Fallback for browsers without native <dialog closedby="any"> support (e.g. Safari)
    let cleanupFallback: (() => void) | undefined;
    if (lightDismiss && !("closedBy" in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isOutside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isOutside(e)) {
          dialog.close();
        }
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupFallback = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      cleanupFallback?.();
    };
  }, [lightDismiss, onClose]);

  // Adapt to mobile virtual keyboard via visualViewport API
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    const handleViewportChange = () => {
      if (!window.visualViewport) return;
      const vv = window.visualViewport;
      // Clamp dialog max-height so it never extends under the soft keyboard
      const availableHeight = Math.max(0, Math.floor(vv.height - 16));
      dialog.style.maxHeight = `${availableHeight}px`;

      // Keep the dialog centered within the visible area on iOS Safari too.
      dialog.style.top = `${vv.offsetTop}px`;
      dialog.style.bottom = `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`;
    };

    handleViewportChange();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", handleViewportChange);
      vv.addEventListener("scroll", handleViewportChange);
    }

    return () => {
      if (vv) {
        vv.removeEventListener("resize", handleViewportChange);
        vv.removeEventListener("scroll", handleViewportChange);
      }
      if (dialog) {
        dialog.style.maxHeight = "";
        dialog.style.top = "";
        dialog.style.bottom = "";
      }
    };
  }, [open]);

  // Smoothly scroll focused input into visible viewport within dialog
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    const cancelScroll = () => clearTimeout(scrollTimer);
    const handleFocusIn = (e: FocusEvent) => {
      cancelScroll();
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.matches("input, select, textarea")) return;

      scrollTimer = setTimeout(() => {
        if (dialog.open && document.activeElement === target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }, 150);
    };

    dialog.addEventListener("focusin", handleFocusIn);
    dialog.addEventListener("focusout", cancelScroll);
    return () => {
      cancelScroll();
      dialog.removeEventListener("focusin", handleFocusIn);
      dialog.removeEventListener("focusout", cancelScroll);
    };
  }, [open]);

  // Dismiss soft keyboard when user drags/swipes to scroll form on mobile
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;

    let touchStartY: number | null = null;
    const bodyEl = dialog.querySelector<HTMLElement>(".clay-modal-body");
    if (!bodyEl) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches.length === 1 ? e.touches[0].clientY : null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY === null || e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - touchStartY;
      if (Math.abs(deltaY) > 25) {
        const active = document.activeElement;
        if (
          active instanceof HTMLElement &&
          bodyEl.contains(active) &&
          active.matches("input, textarea, select")
        ) {
          active.blur();
        }
      }
    };

    bodyEl.addEventListener("touchstart", onTouchStart, { passive: true });
    bodyEl.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      bodyEl.removeEventListener("touchstart", onTouchStart);
      bodyEl.removeEventListener("touchmove", onTouchMove);
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      {...({ closedby: lightDismiss ? "any" : "closerequest" } as Record<
        string,
        string
      >)}
      className={cn(
        "w-[calc(100%-1.5rem)] max-w-lg clay-card clay-modal overflow-hidden rounded-3xl p-0 text-slate-900",
        className
      )}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 bg-brand-50 px-5 py-4">
        <div>
          <h2 id={titleId} className="text-lg font-extrabold text-brand-950">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-0.5 text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Đóng hộp thoại"
          className="clay-icon-button"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="clay-modal-body p-5">{children}</div>
    </dialog>
  );
}
