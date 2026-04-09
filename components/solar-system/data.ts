export const planetsData: Record<string, any> = {
  mercury: {
    n: "Sao Thủy",
    key: "mercury",
    cl: "Màu xám bạc giống đất đá khô",
    d: 180, // orbit diameter
    s: 30, // size
    sp: 7, // speed multiplier (smaller = faster)
    img: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Mercury_in_true_color.jpg",
    map3d: "https://upload.wikimedia.org/wikipedia/commons/9/92/Solarsystemscope_texture_2k_mercury.jpg",
    info: [
      "Nằm ở vị trí số 1, gần Mặt Trời nhất",
      "Hành tinh nhỏ nhất trong tám hành tinh",
      "Quay quanh Mặt Trời cực nhanh",
    ],
  },
  venus: {
    n: "Sao Kim",
    key: "venus",
    cl: "Màu vàng chói từ mây dày",
    d: 270,
    s: 38,
    sp: 11,
    img: "https://upload.wikimedia.org/wikipedia/commons/0/08/Venus_from_Mariner_10.jpg",
    map3d: "https://upload.wikimedia.org/wikipedia/commons/1/1c/Solarsystemscope_texture_2k_venus_surface.jpg",
    info: [
      "Sáng long lanh nhất vào lúc chiều tà",
      "Là nơi nóng nhất vì không khí giữ nhiệt rất tốt",
      "Có hàng ngàn ngọn núi lửa rải rác",
    ],
  },
  earth: {
    n: "Trái Đất",
    key: "earth",
    cl: "Xanh dương, xanh lá và mây trắng",
    d: 365,
    s: 44,
    sp: 18,
    img: "https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg",
    map3d: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Solarsystemscope_texture_2k_earth_daymap.jpg",
    info: [
      "Ngôi nhà xanh duy nhất có con người và muông thú",
      "Được bao phủ phần lớn là đại dương bao la",
      "Bầu trời có lớp không khí Oxy tuyệt vời để thở",
    ],
  },
  mars: {
    n: "Sao Hỏa",
    key: "mars",
    cl: "Màu đỏ rực rỡ như gỉ sắt",
    d: 460,
    s: 35,
    sp: 23,
    img: "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg",
    map3d: "https://upload.wikimedia.org/wikipedia/commons/1/17/Solarsystemscope_texture_2k_mars.jpg",
    info: [
      "Toàn bộ bề mặt hành tinh phủ lớp bụi đỏ khô cằn",
      "Nơi có ngọn núi cao gấp ba lần ngọn núi cao nhất thế giới",
      "Các nhà khoa học đã thấy dấu vết nước băng ở đây",
    ],
  },
  jupiter: {
    n: "Sao Mộc",
    key: "jupiter",
    cl: "Các sọc vằn cam vàng tuyệt đẹp",
    d: 580,
    s: 82,
    sp: 32,
    img: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg",
    map3d: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Solarsystemscope_texture_2k_jupiter.jpg",
    info: [
      "Là anh cả khổng lồ to lớn nhất Hệ Mặt Trời",
      "Giống như quả cầu chứa đầy khí và chất lỏng xoay nhanh",
      "Cơn bão khổng lồ trên đó đã quay liên tục hàng thế kỷ",
    ],
  },
  saturn: {
    n: "Sao Thổ",
    key: "saturn",
    cl: "Vàng nhạt hổ phách dịu dàng",
    d: 720,
    s: 68,
    sp: 45,
    img: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg",
    map3d: "https://upload.wikimedia.org/wikipedia/commons/d/df/Solarsystemscope_texture_2k_saturn.jpg",
    ringMap3d: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Solarsystemscope_texture_2k_saturn_ring_alpha.png",
    info: [
      "Nổi tiếng nhất vì đeo một chiếc vòng cổ bằng đá băng sáng loáng",
      "Trọng lượng nó rất nhẹ, nhẹ hơn cả nước luôn",
      "Vành đai quanh nó làm từ đá và những mảnh băng nhỏ",
    ],
    r: true,
  },
  uranus: {
    n: "Sao Thiên Vương",
    key: "uranus",
    cl: "Màu xanh ngọc trong suốt và tươi mát",
    d: 855,
    s: 50,
    sp: 68,
    img: "https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg",
    map3d: "https://upload.wikimedia.org/wikipedia/commons/9/95/Solarsystemscope_texture_2k_uranus.jpg",
    info: [
      "Tự xoay mình nằm ngang theo cách rất lạ thường",
      "Cực kỳ lạnh giá vì nằm cách rất xa Mặt Trời",
      "Mang màu sắc thanh nhã từ các chất khí tự nhiên",
    ],
  },
  neptune: {
    n: "Sao Hải Vương",
    key: "neptune",
    cl: "Màu xanh dương thẫm giống biển sâu",
    d: 975,
    s: 52,
    sp: 88,
    img: "https://upload.wikimedia.org/wikipedia/commons/5/56/Neptune_Full.jpg",
    map3d: "https://upload.wikimedia.org/wikipedia/commons/1/1e/Solarsystemscope_texture_2k_neptune.jpg",
    info: [
      "Người bạn hành tinh xa trung tâm nhất trong hệ",
      "Ở đây lộng gió khủng khiếp và rất dữ dội",
      "Phải mất hàng trăm năm nó mới đi hết 1 vòng Mặt Trời",
    ],
  },
};

export const listPlanetsKeys = Object.keys(planetsData);

export const quizData = [
  {
    id: 1,
    type: "mcq",
    question: "Hành tinh nào ở sát ngay vị trí đầu tiên, gần Mặt Trời nhất?",
    options: ["A. Sao Kim", "B. Trái Đất", "C. Sao Thủy", "D. Sao Hỏa"],
    correct: 2,
    explanation:
      "Đáp án đúng là: C. Sao Thủy. Sao Thủy ở vị trí thứ nhất nên di chuyển cực kỳ nhanh quanh Mặt Trời.",
  },
  {
    id: 2,
    type: "mcq",
    question: "Bầu trời có lớp khí Oxy cho chúng ta thở chỉ duy nhất có tại?",
    options: ["A. Sao Mộc", "B. Trái Đất", "C. Sao Thổ", "D. Sao Thiên Vương"],
    correct: 1,
    explanation:
      "Đáp án đúng là: B. Trái Đất. Chính xác! Trái Đất xanh là mái nhà duy nhất chúng ta tìm thấy sự sống.",
  },
  {
    id: 3,
    type: "mcq",
    question: "Vành đai sáng chói rực rỡ là đặc trưng của người bạn nào?",
    options: ["A. Sao Hải Vương", "B. Sao Thổ", "C. Sao Kim", "D. Sao Thủy"],
    correct: 1,
    explanation:
      "Đáp án đúng là: B. Sao Thổ. Chiếc vành đai khổng lồ làm từ đá băng của Sao Thổ là đặc điểm lộng lẫy nhất.",
  },
  {
    id: 4,
    type: "mcq",
    question: "Kẻ khổng lồ vĩ đại và to lớn nhất Hệ Mặt Trời tên là gì?",
    options: ["A. Sao Mộc", "B. Sao Thiên Vương", "C. Sao Thủy", "D. Sao Hải Vương"],
    correct: 0,
    explanation:
      "Đáp án đúng là: A. Sao Mộc. Sao Mộc to gấp 1300 lần Trái Đất, xứng danh anh cả trong Hệ.",
  },
  {
    id: 5,
    type: "mcq",
    question: "Sao Hỏa khoác lên mình màu sắc đặc trưng gì bé có biết không?",
    options: ["A. Màu Xanh Thẫm", "B. Màu Đen Sạm", "C. Màu Đỏ Gạch", "D. Màu Vàng Chanh"],
    correct: 2,
    explanation:
      "Đáp án đúng là: C. Màu Đỏ Gạch. Lớp bụi sắt bị rỉ sét đã mang lại cho Sao Hỏa màu sắc đỏ rực rỡ từ xa.",
  },
];
