// ===== Các bài mẫu có sẵn cho trường học =====
const SAMPLE_TEXTS = [
  {
    id: 1,
    name: "Thư chúc Tết phụ huynh & học sinh (chung)",
    title: "Chúc Mừng Năm Mới",
    subtitle: "Xuân Bính Ngọ — 2026",
    recipient: "Kính gửi quý phụ huynh và các con học sinh thân mến!",
    paragraphs: [
      "Xuân Bính Ngọ 2026 đang nhẹ nhàng gõ cửa, mang theo hơi ấm của đất trời, của sum vầy và yêu thương. Trong khoảnh khắc thiêng liêng chuyển giao năm cũ – năm mới, nhà trường xin gửi tới quý phụ huynh cùng các con học sinh lời chúc mừng năm mới sức khỏe – an khang – hạnh phúc – vạn sự như ý.",
      "Năm vừa qua, với sự đồng hành, tin tưởng của quý phụ huynh, cùng sự chăm ngoan, nỗ lực của các con học sinh, nhà trường đã có thêm nhiều niềm vui, nhiều dấu ấn đáng trân trọng. Mỗi bước trưởng thành của các con chính là niềm hạnh phúc lớn lao của thầy cô và gia đình.",
      "Bước sang năm mới, kính mong quý phụ huynh tiếp tục đồng hành, sẻ chia để cùng nhà trường tạo dựng môi trường giáo dục an toàn – thân thiện – yêu thương, giúp các con phát triển toàn diện cả về trí tuệ, thể chất và tâm hồn.",
      "Chúc quý phụ huynh một mùa xuân đầm ấm, chúc các con một năm mới mạnh khỏe – vui tươi – học tập tốt, luôn là những bông hoa rạng rỡ trong khu vườn yêu thương của gia đình và nhà trường."
    ],
    closing: "Trân Trọng.",
    senderName: ""
  },
  {
    id: 2,
    name: "Thư chúc Tết từ Ban Giám hiệu",
    title: "Thư Chúc Tết",
    subtitle: "Bính Ngọ — 2026",
    recipient: "Kính gửi quý phụ huynh và các con học sinh thân yêu!",
    paragraphs: [
      "Tết đến – xuân về là dịp để mỗi gia đình sum họp, để trẻ thơ được đón nhận yêu thương trong những ánh mắt, nụ cười rạng rỡ. Nhân dịp Xuân Bính Ngọ 2026, nhà trường xin gửi lời chúc tốt đẹp nhất tới quý phụ huynh và các con học sinh.",
      "Năm học vừa qua, các con đã có thêm nhiều trải nghiệm ý nghĩa, từng bước trưởng thành trong sự chăm sóc tận tình của thầy cô và gia đình. Mỗi tiến bộ nhỏ của các con đều là niềm vui lớn, là động lực để nhà trường tiếp tục nỗ lực đổi mới, nâng cao chất lượng chăm sóc – giáo dục.",
      "Nhà trường mong rằng trong những ngày Tết, các con sẽ được vui xuân an toàn, giữ gìn nếp sinh hoạt lành mạnh, luôn lễ phép, yêu thương ông bà, cha mẹ.",
      "Kính chúc quý phụ huynh sức khỏe dồi dào, gia đình hạnh phúc; chúc các con một mùa xuân vui tươi – an toàn – tràn đầy tiếng cười, sẵn sàng cho những hành trình mới phía trước."
    ],
    closing: "Trân trọng yêu thương!",
    senderName: ""
  },
  {
    id: 3,
    name: "Thư chúc Tết Mầm non / Tiểu học",
    title: "Chúc Mừng Năm Mới",
    subtitle: "Xuân Bính Ngọ — 2026",
    recipient: "Kính gửi quý phụ huynh và các con học sinh!",
    paragraphs: [
      "Khi sắc xuân lan tỏa khắp mọi nẻo đường, cũng là lúc chúng ta cùng nhìn lại chặng đường đã qua với nhiều nỗ lực, cố gắng và những kết quả đáng ghi nhận. Nhân dịp Tết Nguyên đán Bính Ngọ 2026, nhà trường xin gửi tới quý phụ huynh và các con học sinh lời chúc năm mới bình an – hạnh phúc – thành công.",
      "Những thành quả đạt được trong năm qua là kết tinh của sự phối hợp chặt chẽ giữa gia đình – nhà trường – học sinh. Nhà trường trân trọng cảm ơn quý phụ huynh đã luôn tin tưởng, ủng hộ; cảm ơn các con học sinh đã chăm ngoan, lễ phép, nỗ lực từng ngày.",
      "Xuân mới mở ra nhiều hy vọng mới. Mong rằng mỗi ngày đến trường của các con luôn là một ngày vui; mỗi gia đình luôn tràn ngập tiếng cười; và mối quan hệ giữa gia đình – nhà trường ngày càng bền chặt.",
      "Kính chúc quý phụ huynh một năm mới an khang thịnh vượng, chúc các con học sinh hay ăn chóng lớn, chăm ngoan, học giỏi, đón một mùa xuân thật trọn vẹn yêu thương."
    ],
    closing: "Thân ái!",
    senderName: ""
  },
  {
    id: 4,
    name: "Thư chúc Tết THCS / THPT",
    title: "Thư Chúc Tết",
    subtitle: "Bính Ngọ — 2026",
    recipient: "Kính gửi quý phụ huynh và các con học sinh thân mến!",
    paragraphs: [
      "Trong không khí rộn ràng đón Xuân Bính Ngọ 2026, nhà trường xin gửi tới quý phụ huynh và các con học sinh những lời chúc mừng năm mới chân thành và ấm áp nhất.",
      "Một năm đã qua với nhiều kỷ niệm đẹp, nhiều nỗ lực và cố gắng từ cả thầy cô, phụ huynh và học sinh. Nhà trường luôn trân quý sự tin tưởng của quý phụ huynh và tự hào về sự tiến bộ từng ngày của các con.",
      "Xuân mới là khởi đầu mới. Mong rằng mỗi gia đình luôn là điểm tựa yêu thương; mỗi đứa trẻ luôn được lắng nghe, được tôn trọng và được phát triển trong niềm vui.",
      "Kính chúc quý phụ huynh sức khỏe – hạnh phúc – bình an; chúc các con học sinh một năm mới vui vẻ, chăm ngoan, học tập tốt, đón Tết an toàn, ấm áp bên gia đình. Thân chúc năm mới an khang – thịnh vượng!"
    ],
    closing: "Trân Trọng.",
    senderName: ""
  },
  {
    id: 5,
    name: "Thư chúc Tết đồng nghiệp giáo viên",
    title: "Chúc Mừng Năm Mới",
    subtitle: "Xuân Bính Ngọ — 2026",
    recipient: "Kính gửi quý thầy cô giáo thân mến!",
    paragraphs: [
      "Nhân dịp Tết Nguyên đán Xuân Bính Ngọ 2026, Ban Giám hiệu nhà trường xin gửi tới toàn thể quý thầy cô giáo lời chúc mừng năm mới tốt đẹp nhất, lời tri ân sâu sắc nhất.",
      "Một năm qua, quý thầy cô đã không ngừng cống hiến, tận tâm với nghề, yêu thương học trò và đóng góp cho sự phát triển của nhà trường. Mỗi thành tích của học sinh, mỗi nụ cười của phụ huynh đều có dấu ấn của sự nỗ lực không mệt mỏi từ quý thầy cô.",
      "Bước sang năm mới, mong rằng quý thầy cô luôn giữ vững ngọn lửa đam mê với nghề giáo, tiếp tục là những người lái đò tận tụy, là tấm gương sáng cho thế hệ trẻ noi theo.",
      "Kính chúc quý thầy cô một năm mới tràn đầy sức khỏe, niềm vui và hạnh phúc. Chúc gia đình quý thầy cô luôn an khang – thịnh vượng, vạn sự như ý!"
    ],
    closing: "Trân trọng và biết ơn!",
    senderName: ""
  }
];
