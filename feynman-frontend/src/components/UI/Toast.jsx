import { motion, AnimatePresence } from 'framer-motion';
import useBrainStore from '../../store/brainStore';

const TYPE_STYLES = {
    success: {
        borderColor: 'rgba(0, 212, 255, 0.3)',
        iconColor: '#00d4ff',
        glow: 'rgba(0, 212, 255, 0.08)',
    },
    info: {
        borderColor: 'rgba(0, 212, 255, 0.3)',
        iconColor: '#00d4ff',
        glow: 'rgba(0, 212, 255, 0.08)',
    },
    connection: {
        borderColor: 'rgba(0, 255, 136, 0.3)',
        iconColor: '#00ff88',
        glow: 'rgba(0, 255, 136, 0.08)',
    },
    warning: {
        borderColor: 'rgba(255, 107, 53, 0.3)',
        iconColor: '#ff6b35',
        glow: 'rgba(255, 107, 53, 0.08)',
    },
    danger: {
        borderColor: 'rgba(255, 45, 85, 0.3)',
        iconColor: '#ff2d55',
        glow: 'rgba(255, 45, 85, 0.08)',
    },
};

export default function Toast() {
    const toasts = useBrainStore((s) => s.toasts);
    const removeToast = useBrainStore((s) => s.removeToast);

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '90px',
                right: '24px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column-reverse',
                gap: '8px',
                pointerEvents: 'none',
            }}
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => {
                    const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;

                    return (
                        <motion.div
                            key={toast.id}
                            layout
                            initial={{ x: 80, opacity: 0, scale: 0.9 }}
                            animate={{ x: 0, opacity: 1, scale: 1 }}
                            exit={{ x: 80, opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                            onClick={() => removeToast(toast.id)}
                            style={{
                                pointerEvents: 'auto',
                                background: 'rgba(2, 8, 20, 0.92)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                borderRadius: '12px',
                                border: `1px solid ${style.borderColor}`,
                                padding: '12px 18px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                maxWidth: '340px',
                                boxShadow: `0 4px 24px rgba(0, 0, 0, 0.4), 0 0 20px ${style.glow}`,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '14px',
                                    color: style.iconColor,
                                    flexShrink: 0,
                                    filter: `drop-shadow(0 0 4px ${style.iconColor})`,
                                }}
                            >
                                {toast.icon || '✦'}
                            </span>
                            <span
                                style={{
                                    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                                    fontSize: '12px',
                                    color: 'rgba(232, 244, 253, 0.85)',
                                    lineHeight: '1.4',
                                    letterSpacing: '0.3px',
                                }}
                            >
                                {toast.message}
                            </span>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
