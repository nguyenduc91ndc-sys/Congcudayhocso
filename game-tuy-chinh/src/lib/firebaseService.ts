import { database } from './firebaseConfig';
import { ref, set, get } from 'firebase/database';
import { Question } from '../hooks/useGameLogic';

// Generate 6 character random ID
const generateGameId = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

export const saveCustomGame = async (title: string, questions: Question[], ownerId: string, oldGameId?: string): Promise<string> => {
    const gameId = oldGameId || generateGameId();
    const gameRef = ref(database, `custom_games/${gameId}`);

    await set(gameRef, {
        title,
        questions,
        ownerId,
        createdAt: Date.now(),
    });

    return gameId;
};

export const getCustomGame = async (gameId: string): Promise<{ title: string, questions: Question[] } | null> => {
    try {
        const gameRef = ref(database, `custom_games/${gameId}`);
        const snapshot = await get(gameRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            return {
                title: data.title || 'Game Tùy Chỉnh',
                questions: data.questions || []
            };
        }
        return null;
    } catch (error) {
        console.error('Lỗi khi tải bộ câu hỏi:', error);
        return null;
    }
};

export const getUserCustomGames = async (ownerId: string): Promise<Array<{ gameId: string, title: string, count: number, createdAt: number }>> => {
    try {
        const gamesRef = ref(database, 'custom_games');
        const snapshot = await get(gamesRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            const userGames: Array<any> = [];

            Object.entries(data).forEach(([gameId, gameData]: [string, any]) => {
                if (gameData.ownerId === ownerId) {
                    userGames.push({
                        gameId,
                        title: gameData.title || `Bộ câu hỏi ${gameId}`,
                        count: gameData.questions?.length || 0,
                        createdAt: gameData.createdAt
                    });
                }
            });

            userGames.sort((a, b) => b.createdAt - a.createdAt);
            return userGames;
        }
        return [];
    } catch (error) {
        console.error('Lỗi tải danh sách game:', error);
        return [];
    }
};

export const deleteCustomGame = async (gameId: string, ownerId: string): Promise<boolean> => {
    try {
        const gameRef = ref(database, `custom_games/${gameId}`);
        const snapshot = await get(gameRef);

        if (snapshot.exists() && snapshot.val().ownerId === ownerId) {
            await set(gameRef, null);
            // Delete leaderboard as well
            await set(ref(database, `custom_game_leaderboards/${gameId}`), null);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Lỗi xóa game:', error);
        return false;
    }
};

// Leaderboard operations
export const saveGameScore = async (gameId: string, entry: { id: string, name: string, className: string, score: number, date: string }) => {
    const lbRef = ref(database, `custom_game_leaderboards/${gameId}/${entry.id}`);
    await set(lbRef, entry);
};

export const getGameLeaderboard = async (gameId: string): Promise<any[]> => {
    try {
        const lbRef = ref(database, `custom_game_leaderboards/${gameId}`);
        const snapshot = await get(lbRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            const entries = Object.values(data);
            entries.sort((a: any, b: any) => b.score - a.score);
            return entries;
        }
        return [];
    } catch (error) {
        console.error('Lỗi tải BXH:', error);
        return [];
    }
};

export const resetGameLeaderboard = async (gameId: string, ownerId: string): Promise<boolean> => {
    try {
        // Validate ownership first
        const gameRef = ref(database, `custom_games/${gameId}`);
        const sn = await get(gameRef);
        if (sn.exists() && sn.val().ownerId === ownerId) {
            await set(ref(database, `custom_game_leaderboards/${gameId}`), null);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Lỗi xóa BXH:', error);
        return false;
    }
};
