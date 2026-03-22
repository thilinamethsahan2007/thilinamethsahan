import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = "success", duration = 3000) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        if (duration) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div
                style={{
                    position: "fixed",
                    bottom: "2rem",
                    right: "2rem",
                    zIndex: 9999,
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    pointerEvents: "none", // Allow clicking through the container
                }}
            >
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem = ({ toast, onRemove }) => {
    const icons = {
        success: <CheckCircle size={20} className="text-green-400" />,
        error: <AlertCircle size={20} className="text-red-400" />,
        info: <Info size={20} className="text-blue-400" />,
    };

    const colors = {
        success: "#052e16", // green-950
        error: "#450a0a", // red-950
        info: "#172554", // blue-950
    };

    const borders = {
        success: "#22c55e",
        error: "#ef4444",
        info: "#3b82f6",
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            layout
            style={{
                width: "300px",
                background: "rgba(10, 10, 10, 0.9)",
                backdropFilter: "blur(10px)",
                border: `1px solid ${borders[toast.type]}`,
                borderLeft: `4px solid ${borders[toast.type]}`,
                borderRadius: "0.5rem",
                padding: "1rem",
                color: "#fff",
                display: "flex",
                alignItems: "start",
                gap: "0.75rem",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                pointerEvents: "auto",
                cursor: "pointer"
            }}
            onClick={() => onRemove(toast.id)}
        >
            <div style={{ color: borders[toast.type], marginTop: '2px' }}>
                {icons[toast.type] || icons.info}
            </div>
            <div style={{ flex: 1, fontSize: "0.9rem", lineHeight: "1.4" }}>
                {toast.message}
            </div>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(toast.id);
                }}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    padding: 0
                }}
            >
                <X size={16} />
            </button>
        </motion.div>
    );
};
