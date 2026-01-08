import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MoodSubmissionLoader = ({ isVisible }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 flex flex-col items-center"
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="w-14 h-14 rounded-full border-[3px] border-indigo-500/30 border-t-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                    />
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-3 text-indigo-300 font-bold text-sm tracking-widest uppercase text-shadow"
                    >
                        Sending Vibe
                    </motion.span>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MoodSubmissionLoader;
