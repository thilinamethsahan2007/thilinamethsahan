import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export const CustomCursor = () => {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const mouseMove = (e) => {
            setMousePosition({
                x: e.clientX,
                y: e.clientY
            });

            // Check if hovering over a clickable element
            const target = e.target;
            if (target.tagName.toLowerCase() === 'a' || 
                target.tagName.toLowerCase() === 'button' || 
                target.closest('a') || 
                target.closest('button')) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener("mousemove", mouseMove);
        return () => {
            window.removeEventListener("mousemove", mouseMove);
        };
    }, []);

    // Hide if mouse leaves window or on touch devices
    if (typeof window !== 'undefined' && 'ontouchstart' in window) return null;

    return (
        <>
            {/* The Dot */}
            <motion.div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "8px",
                    height: "8px",
                    backgroundColor: "var(--accent)",
                    borderRadius: "50%",
                    pointerEvents: "none",
                    zIndex: 9999,
                    x: mousePosition.x - 4,
                    y: mousePosition.y - 4,
                }}
            />
            {/* The Ring */}
            <motion.div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "40px",
                    height: "40px",
                    border: "1px solid var(--accent)",
                    borderRadius: "50%",
                    pointerEvents: "none",
                    zIndex: 9998,
                }}
                animate={{
                    x: mousePosition.x - 20,
                    y: mousePosition.y - 20,
                    scale: isHovering ? 1.5 : 1,
                    backgroundColor: isHovering ? "rgba(255, 215, 0, 0.1)" : "transparent"
                }}
                transition={{
                    type: "spring",
                    stiffness: 150,
                    damping: 15,
                    mass: 0.5
                }}
            />
        </>
    );
};
