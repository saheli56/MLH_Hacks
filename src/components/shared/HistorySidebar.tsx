"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, History, Clock, User, Target, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface HistoryItem {
  username: string;
  interest: string;
  timestamp: number;
}

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (username: string, interest: string) => void;
}

export function HistorySidebar({ isOpen, onClose, onSelect }: HistorySidebarProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/agent/history");
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm glass-surface border-l border-border z-[70] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-accent" />
                <h2 className="font-semibold text-text-primary">Research History</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-text-muted">Loading history...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-20 px-6">
                  <History className="w-10 h-10 text-text-muted/20 mx-auto mb-4" />
                  <p className="text-sm text-text-muted">No history found yet.</p>
                  <p className="text-xs text-text-muted/60 mt-1">Start researching to build your history!</p>
                </div>
              ) : (
                history.map((item, i) => (
                  <motion.button
                    key={`${item.username}-${item.timestamp}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      onSelect(item.username, item.interest);
                      onClose();
                    }}
                    className="w-full text-left p-4 rounded-xl border border-border/50 bg-white/5 hover:bg-white/10 hover:border-accent/30 transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-accent uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(item.timestamp)} ago
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-sm font-medium text-text-primary truncate">
                          {item.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-xs text-text-muted truncate">
                          {item.interest || "No specific interest"}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))
              )}
            </div>

            <div className="p-6 border-t border-border bg-black/20">
              <p className="text-[10px] text-text-muted/60 text-center uppercase tracking-widest font-medium">
                Results are cached for faster access
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
