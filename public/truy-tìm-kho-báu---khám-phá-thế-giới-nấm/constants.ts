
import { Question } from './types';

const BASE_URL = 'https://raw.githubusercontent.com/TH-edu/khodulieu2/refs/heads/main/';

export const ASSETS = {
  BACKGROUND: `${BASE_URL}nen.png`,
  LOGO: `${BASE_URL}logo.png`,
  MAP_EXPLORER: `${BASE_URL}nhanvatthamhiem.png`,
  BGM: `${BASE_URL}nengame.mp3`,
  SFX_CORRECT: `${BASE_URL}dung.mp3`,
  SFX_WRONG: `${BASE_URL}sai.mp3`,
  SFX_TRANSITION: `${BASE_URL}ting.mp3`,
  VIDEO_IN: `${BASE_URL}videoin.mp4`,
  VIDEO_OUT: `${BASE_URL}videoout.mp4`,
  CHANG5_B: `${BASE_URL}chang5b.png`
};

export const QUESTIONS: Question[] = [
  {
    id: 1,
    type: 'Nhận biết',
    question: 'Một số bộ phận chính của nấm mũ thường bao gồm các phần nào?',
    options: [
      'A. Rễ, thân, lá.',
      'B. Thân, cành, lá.',
      'C. Hoa, quả, hạt.',
      'D. Mũ nấm, thân nấm và chân nấm.'
    ],
    answer: 'D. Mũ nấm, thân nấm và chân nấm.',
    explanation: 'Cấu tạo của Nấm gồm ba phần từ trên xuống dưới là: mũ nấm (phần xòe rộng), thân nấm (phần trụ ở giữa) và chân nấm (phần dưới cùng bám vào giá thể).',
    stageName: 'Rừng nấm',
    stageIcon: '🍄',
    stageImage: `${BASE_URL}chang1.png`
  },
  {
    id: 2,
    type: 'Thông hiểu',
    question: 'Nấm men được con người ứng dụng rộng rãi nhất trong việc sản xuất loại thực phẩm nào sau đây?',
    options: [
      'A. Bánh mì, rượu, bia.',
      'B. Nước khoáng và nước ngọt.',
      'C. Rau xanh và trái cây.',
      'D. Cá khô và thịt tươi.'
    ],
    answer: 'A. Bánh mì, rượu, bia.',
    explanation: 'Nấm men là loại nấm có ích, được con người sử dụng phổ biến trong chế biến thực phẩm để làm nở bột khi sản xuất bánh mì, bánh bao. Ngoài ra, nấm men còn đóng vai trò quan trọng trong quá trình lên men để tạo ra các loại đồ uống như rượu và bia.',
    stageName: 'Suối nấm',
    stageIcon: '💧',
    stageImage: `${BASE_URL}chang2.png`
  },
  {
    id: 3,
    type: 'Vận dụng',
    question: 'Những loại nấm nào sau đây thường được sử dụng làm thuốc trong y học cổ truyền để tăng cường sức khỏe và hỗ trợ điều trị bệnh?',
    options: [
      'A. Nấm rơm và nấm mỡ.',
      'B. Nấm linh chi và nấm đông trùng hạ thảo.',
      'C. Nấm men và nấm mốc.',
      'D. Nấm sò và nấm tai mèo.'
    ],
    answer: 'B. Nấm linh chi và nấm đông trùng hạ thảo.',
    explanation: 'Trong tự nhiên có nhiều loại nấm quý chứa hàm lượng dinh dưỡng cao và có dược tính mạnh. Nấm linh chi và nấm đông trùng hạ thảo là những ví dụ điển hình được sử dụng trong y học cổ truyền để giúp tăng cường sức khỏe và hỗ trợ điều trị một số bệnh cho con người.',
    stageName: 'Hang nấm',
    stageIcon: '🧗',
    stageImage: `${BASE_URL}chang3.png`
  },
  {
    id: 4,
    type: 'Vận dụng cao',
    question: 'Điều kiện môi trường nào dưới đây là nguyên nhân chính thúc đẩy nấm mốc phát triển mạnh gây hỏng thực phẩm?',
    options: [
      'A. Nhiệt độ thấp và môi trường khô ráo.',
      'B. Ánh sáng mặt trời trực tiếp và nhiệt độ cao.',
      'C. Nhiệt độ cao và độ ẩm cao.',
      'D. Môi trường chân không và hoàn toàn không có không khí.'
    ],
    answer: 'C. Nhiệt độ cao và độ ẩm cao.',
    explanation: 'Nấm mốc phát triển rất nhanh khi gặp môi trường thuận lợi, đặc biệt là nơi có nhiệt độ cao và độ ẩm cao. Khí hậu nhiệt đới của Việt Nam chính là điều kiện lý tưởng thúc đẩy nấm mốc sinh sôi, gây hỏng thực phẩm và các vật dụng trong nhà.',
    stageName: 'Núi nấm',
    stageIcon: '⛰️',
    stageImage: `${BASE_URL}chang4.png`
  },
  {
    id: 5,
    type: 'Tổng hợp',
    question: 'Khi thực phẩm bị nhiễm nấm mốc, tại sao chúng ta tuyệt đối không được sử dụng ngay cả khi đã cắt bỏ phần nhìn thấy mốc?',
    options: [
      'A. Vì nấm mốc làm thực phẩm mất đi mùi vị thơm ngon ban đầu.',
      'B. Vì nấm mốc làm thay đổi màu sắc của thực phẩm, gây mất thẩm mỹ.',
      'C. Vì nấm mốc chỉ sống ở lớp bề mặt, không ảnh hưởng đến bên trong.',
      'D. Vì nấm mốc tạo ra độc tố gây hại cho gan, thận, gây ung thư hoặc dẫn đến tử vong.'
    ],
    answer: 'D. Vì nấm mốc tạo ra độc tố gây hại cho gan, thận, gây ung thư hoặc dẫn đến tử vong.',
    explanation: 'Tuyệt đối không được ăn thực phẩm đã nhiễm mốc vì chúng chứa các độc tố ngấm sâu bên trong. Việc sử dụng thực phẩm này sẽ gây hại trực tiếp cho các cơ quan nội tạng như gan, thận, dẫn đến rối loạn tiêu hóa, lâu dài có thể gây ung thư hoặc thậm chí là tử vong.',
    stageName: 'Kho báu thần kỳ',
    stageIcon: '💎',
    stageImage: `${BASE_URL}chang5a.png`
  }
];

export const STAGES = [
  { id: 0, name: 'Rừng nấm', icon: '🍄' },
  { id: 1, name: 'Suối nấm', icon: '💧' },
  { id: 2, name: 'Hang nấm', icon: '🧗' },
  { id: 3, name: 'Núi nấm', icon: '⛰️' },
  { id: 4, name: 'Kho báu thần kỳ', icon: '💎' },
];
