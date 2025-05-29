import React, { ReactNode, useState } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: "center" | "right";
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = "center",
}) => {
  const [visible, setVisible] = useState(false);

  let positionClass = "left-1/2 -translate-x-1/2";
  if (placement === "right") {
    positionClass = "right-0 translate-x-0";
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
    >
      {children}
      {visible && (
        <span
          className={`absolute z-[100] ${positionClass} mt-3 flex flex-col items-center pointer-events-none`}
        >
          {/* Arrow */}
          <span className="w-2 h-2 rotate-45 bg-slate-800/95 shadow-md mb-[-4px]" />
          {/* Tooltip box */}
          <span className="px-2.5 py-1 rounded-md bg-slate-800/95 text-white text-xs font-medium shadow-lg whitespace-nowrap animate-tooltip-fade">
            {content}
          </span>
        </span>
      )}
      <style jsx global>{`
        @keyframes tooltip-fade {
          0% {
            opacity: 0;
            transform: scale(0.95) translateY(4px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-tooltip-fade {
          animation: tooltip-fade 0.18s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </span>
  );
};
