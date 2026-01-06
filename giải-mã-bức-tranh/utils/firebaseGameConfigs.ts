/**
 * Firebase Game Configs - Lưu trữ cấu hình game trên Firebase
 * Giải quyết vấn đề URL quá dài khi chia sẻ link
 */
import { database } from '../../utils/firebaseConfig';
import { ref, set, get, query, orderByChild, equalTo } from 'firebase/database';
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
 * @param ownerId ID của người tạo (từ Firebase Auth)
 * @returns Game ID để chia sẻ
 */
export const saveGameConfig = async (config: GameConfig, ownerId?: string): Promise<string> => {
    const gameId = generateGameId();
    const gameRef = ref(database, `decode_games/${gameId}`);

    await set(gameRef, {
        ...config,
        ownerId: ownerId || 'anonymous',
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
            // Loại bỏ metadata khi trả về
            const { createdAt, ownerId, ...config } = data;
            return config as GameConfig;
        }
        return null;
    } catch (error) {
        console.error('Error fetching game config:', error);
        return null;
    }
};

/**
 * Lấy danh sách game của người dùng
 * @param ownerId ID của người dùng
 * @returns Danh sách game configs
 */
export const getUserGames = async (ownerId: string): Promise<Array<{ gameId: string; config: GameConfig; createdAt: number }>> => {
    try {
        const gamesRef = ref(database, 'decode_games');
        const snapshot = await get(gamesRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            const userGames: Array<{ gameId: string; config: GameConfig; createdAt: number }> = [];

            Object.entries(data).forEach(([gameId, gameData]: [string, any]) => {
                if (gameData.ownerId === ownerId) {
                    const { createdAt, ownerId: owner, ...config } = gameData;
                    userGames.push({
                        gameId,
                        config: config as GameConfig,
                        createdAt
                    });
                }
            });

            // Sort by createdAt descending
            userGames.sort((a, b) => b.createdAt - a.createdAt);
            return userGames;
        }
        return [];
    } catch (error) {
        console.error('Error fetching user games:', error);
        return [];
    }
};

/**
 * Xóa game config
 * @param gameId ID của game
 * @param ownerId ID của người dùng (để xác thực quyền xóa)
 */
export const deleteGameConfig = async (gameId: string, ownerId: string): Promise<boolean> => {
    try {
        const gameRef = ref(database, `decode_games/${gameId}`);
        const snapshot = await get(gameRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            if (data.ownerId === ownerId) {
                await set(gameRef, null);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error deleting game config:', error);
        return false;
    }
};
