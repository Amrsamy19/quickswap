import React, { useEffect, useState } from 'react';
import { Undo2, AlertCircle } from 'lucide-react';

interface UndoToastProps {
  message: string;
  durationSeconds?: number;
  onUndo: () => void;
  onTimeout: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  message,
  durationSeconds = 5,
  onUndo,
  onTimeout,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onTimeout();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onTimeout]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-toast-enter">
      <div className="bg-[#161F30] border border-blue-500/40 shadow-2xl shadow-blue-900/30 rounded-xl px-4 py-3 flex items-center gap-4 text-white">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">
          <AlertCircle className="w-4 h-4" />
        </div>
        <div className="text-xs">
          <div className="font-semibold text-slate-200">{message}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Hardware credentials will be permanently erased in {secondsLeft}s
          </div>
        </div>
        <button
          onClick={onUndo}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Undo</span>
        </button>
      </div>
    </div>
  );
};
