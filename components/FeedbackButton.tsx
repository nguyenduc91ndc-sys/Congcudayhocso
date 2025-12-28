import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import FeedbackModal from './FeedbackModal';
import { User } from '../types';

interface FeedbackButtonProps {
    user: User;
}

const FeedbackButton: React.FC<FeedbackButtonProps> = ({ user }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsModalOpen(true)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
                title="Gửi phản hồi"
            >
                <motion.div
                    animate={{
                        rotate: [0, -10, 10, -10, 0],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3
                    }}
                >
                    <MessageCircle size={22} />
                </motion.div>
                <span className="font-bold text-sm">Gửi phản hồi</span>

                {/* Pulse animation */}
                <span className="absolute inset-0 rounded-full bg-pink-400 animate-ping opacity-20" />
            </motion.button>

            {/* Modal */}
            <FeedbackModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={user}
            />
        </>
    );
};

export default FeedbackButton;
