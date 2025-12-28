import { Question } from './types';

export const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Câu thường có mấy thành phần chính? Đó là các thành phần nào?",
    options: [
      { id: "A", text: "Gồm 2 thành phần chính: chủ ngữ và vị ngữ" },
      { id: "B", text: "Gồm 3 thành phần chính: chủ ngữ, vị ngữ và trạng ngữ" },
      { id: "C", text: "Gồm 2 thành phần chính: chủ ngữ và trạng ngữ" }
    ],
    correctAnswerId: "A"
  },
  {
    id: 2,
    question: "Chủ ngữ thường trả lời cho câu hỏi nào?",
    options: [
      { id: "A", text: "Làm gì, thế nào, là ai,..." },
      { id: "B", text: "Làm gì, ai, con gì,..." },
      { id: "C", text: "Ai, cái gì, con gì,..." }
    ],
    correctAnswerId: "C"
  },
  {
    id: 3,
    question: "Tìm chủ ngữ trong câu sau: “Chú chim sơn ca nhảy nhót trên cành cây.”",
    options: [
      { id: "A", text: "Chú chim" },
      { id: "B", text: "Chú chim sơn ca" },
      { id: "C", text: "Nhảy nhót trên cành cây" }
    ],
    correctAnswerId: "B"
  }
];

export const TOTAL_STAGES = QUESTIONS.length; // 3 questions
