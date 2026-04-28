"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, CircleNotchIcon, CheckIcon } from "@phosphor-icons/react";

interface SlideActionProps {
  onAction: () => void | Promise<void>;
  label?: string;
  loadingLabel?: string;
  successLabel?: string;
  isLoading?: boolean;
  isSuccess?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SlideAction({
  onAction,
  label = "Slide to send",
  loadingLabel = "Processing...",
  successLabel = "Done!",
  isLoading = false,
  isSuccess = false,
  disabled = false,
  className,
}: SlideActionProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const THUMB_SIZE = 56; // h-14 w-14

  useEffect(() => {
    if (isSuccess || isLoading) {
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        setDragX(containerRect.width - THUMB_SIZE - 8);
      }
    } else if (!isDragging) {
      setDragX(0);
    }
  }, [isSuccess, isLoading, isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || isLoading || isSuccess) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const maxDragX = containerRect.width - THUMB_SIZE - 8;
    
    let newX = e.clientX - containerRect.left - (THUMB_SIZE / 2);
    newX = Math.max(0, Math.min(newX, maxDragX));
    
    setDragX(newX);
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (!containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const maxDragX = containerRect.width - THUMB_SIZE - 8;
    
    if (dragX >= maxDragX * 0.9) {
      setDragX(maxDragX);
      await onAction();
    } else {
      setDragX(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-16 w-full items-center rounded-none bg-muted p-1 overflow-hidden transition-opacity",
        (disabled && !isLoading && !isSuccess) && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className={cn(
          "text-sm font-medium transition-opacity duration-300", 
          (isLoading || isSuccess || isDragging) ? "opacity-0" : "opacity-100 text-muted-foreground"
        )}>
          {disabled ? "Enter amount to send" : label}
        </span>
        
        <span className={cn(
          "absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground transition-opacity duration-300",
          (isLoading || isSuccess) ? "opacity-100" : "opacity-0"
        )}>
          {isLoading ? loadingLabel : isSuccess ? successLabel : ""}
        </span>
      </div>

      <div 
        className="absolute left-0 top-0 bottom-0 bg-primary/20 rounded-none transition-all"
        style={{ 
          width: `${dragX + THUMB_SIZE + 8}px`, 
          transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
        }}
      />

      <div
        ref={thumbRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-none bg-primary text-primary-foreground shadow-sm touch-none",
          !isDragging && "transition-[transform] duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
          (disabled || isLoading || isSuccess) && "pointer-events-none cursor-not-allowed",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ transform: `translateX(${dragX}px)` }}
      >
        {isLoading ? (
          <CircleNotchIcon className="h-6 w-6 animate-spin" weight="bold" />
        ) : isSuccess ? (
          <CheckIcon className="h-6 w-6" weight="bold" />
        ) : (
          <ArrowRightIcon className="h-6 w-6" weight="bold" />
        )}
      </div>
    </div>
  );
}
