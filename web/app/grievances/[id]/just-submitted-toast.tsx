"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function JustSubmittedToast() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="pointer-events-auto fixed left-1/2 top-20 z-50 flex w-[min(420px,calc(100vw-32px))] -translate-x-1/2 items-center gap-3 rounded-2xl border border-emerald-300/50 bg-emerald-50/95 px-4 py-3 shadow-xl shadow-emerald-500/10 backdrop-blur-md dark:border-emerald-500/30 dark:bg-emerald-950/80"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-emerald-900 dark:text-emerald-100">
              Grievance submitted!
            </p>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-200/70">
              The agent classified, routed and drafted your complaint.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="grid h-7 w-7 place-items-center rounded-md text-emerald-700/80 hover:bg-emerald-100 hover:text-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
