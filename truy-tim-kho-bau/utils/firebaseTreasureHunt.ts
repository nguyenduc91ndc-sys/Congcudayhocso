/**
 * Firebase integration for Treasure Hunt game
 * Lưu/load cấu hình game tùy chỉnh
 */
import { database } from '../../utils/firebaseConfig';
import { ref, set, get } from 'firebase/database';
import { GameConfig } from '../types';

// Tạo game ID ngẫu nhiên 8 ký tự
const generateGameId = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Lưu cấu hình game lên Firebase
 */
export const saveTreasureHuntConfig = async (config: GameConfig, ownerId?: string): Promise<string> => {
    const gameId = generateGameId();
    const gameRef = ref(database, `treasure_hunt_games/${gameId}`);
    await set(gameRef, {
        ...config,
        ownerId: ownerId || 'anonymous',
        createdAt: Date.now(),
    });
    return gameId;
};

/**
 * Lấy cấu hình game từ Firebase
 */
export const getTreasureHuntConfig = async (gameId: string): Promise<GameConfig | null> => {
    try {
        const gameRef = ref(database, `treasure_hunt_games/${gameId}`);
        const snapshot = await get(gameRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            const { createdAt, ownerId, ...config } = data;
            return config as GameConfig;
        }
        return null;
    } catch (error) {
        console.error('Lỗi khi tải cấu hình game:', error);
        return null;
    }
};
