
import { GameConfig } from './types';

export const GRID_SIZE = 144; // 16x9 grid for 16:9 aspect ratio

export const INITIAL_CONFIG: GameConfig = {
  hiddenImage: 'https://picsum.photos/800/800?random=1',
  questions: [
    {
      id: '1',
      content: 'Thủ đô của Việt Nam là gì?',
      options: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Huế'],
      correctIndex: 0,
    },
    {
      id: '2',
      content: '2 + 2 bằng bao nhiêu?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
    },
    {
      id: '3',
      content: 'Trái Đất có hình gì?',
      options: ['Hình vuông', 'Hình tam giác', 'Hình cầu', 'Hình phẳng'],
      correctIndex: 2,
    }
  ],
};

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'giaovien4.0'
};
