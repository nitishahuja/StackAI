import React from "react";

export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
);
