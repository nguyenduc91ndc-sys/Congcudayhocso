/**
 * Firebase Game Configs - Lưu trữ cấu hình game trên Firebase
 * Giải quyết vấn đề URL quá dài khi chia sẻ link
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
 * @param config Cấu hình game cần lưu
 * @returns Game ID để chia sẻ
 */
export const saveGameConfig = async (config: GameConfig): Promise<string> => {
    const gameId = generateGameId();
    const gameRef = ref(database, `decode_games/${gameId}`);

    await set(gameRef, {
        ...config,
        createdAt: Date.now(),
    });

    return gameId;
};

/**
 * Lấy cấu hình game từ Firebase
 * @param gameId ID của game
 * @returns Cấu hình game hoặc null nếu không tìm thấy
 */
export const getGameConfig = async (gameId: string): Promise<GameConfig | null> => {
    try {
        const gameRef = ref(database, `decode_games/${gameId}`);
        const snapshot = await get(gameRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            // Loại bỏ createdAt khi trả về
            const { createdAt, ...config } = data;
            return config as GameConfig;
        }
        return null;
    } catch (error) {
        console.error('Error fetching game config:', error);
        return null;
    }
};
