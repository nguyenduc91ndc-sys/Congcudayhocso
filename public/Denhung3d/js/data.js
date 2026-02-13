/* =============================================
   DỮ LIỆU CÁC ĐIỂM THAM QUAN ĐỀN HÙNG
   ============================================= */

const LOCATIONS_DATA = {
    "cong-den": {
        id: "cong-den",
        number: 1,
        name: "Cổng Đền Hùng",
        image: "images/cong_den_hung.png",
        realImage: "images/anhngoai/Cổng đền Hùng.png",
        audio: "giongdoc/Cổng đền.mp3",
        vr360Image: null, // Legacy field - not used
        vrStreetView: "https://www.google.com/maps/embed?pb=!4v1770485334274!6m8!1m7!1sMnxaj_yJkyyaRkWZBykABA!2m2!1d21.36285727983253!2d105.3138214450857!3f354.74133712799664!4f0!5f0.7820865974627469", // Real Street View 360 - Cong Den Hung
        description: `Cổng Đền Hùng là điểm khởi đầu của hành trình lên Đền Hùng. 
Cổng được xây dựng với kiến trúc mái vòm hai tầng, trên có họa tiết "lưỡng long chầu nguyệt" (hai con rồng chầu mặt trăng). 
Trên cổng có bức đại tự "Cao sơn cảnh hành" nghĩa là "Núi cao đường lớn". 
Từ đây, các bạn nhỏ sẽ leo 495 bậc đá để lên đến Đền Thượng trên đỉnh núi Nghĩa Lĩnh!`,
        quiz: [
            {
                question: "Cổng Đền Hùng có bao nhiêu tầng mái?",
                options: ["Một tầng", "Hai tầng", "Ba tầng", "Bốn tầng"],
                correct: 1,
                explanation: "Cổng Đền Hùng được xây dựng với kiến trúc mái vòm hai tầng."
            },
            {
                question: "Họa tiết nào được khắc trên cổng?",
                options: ["Hoa sen", "Lưỡng long chầu nguyệt", "Chim Lạc", "Trống đồng"],
                correct: 1,
                explanation: "Trên cổng có họa tiết 'lưỡng long chầu nguyệt' - hai con rồng chầu mặt trăng."
            },
            {
                question: "'Cao sơn cảnh hành' có nghĩa là gì?",
                options: ["Cổng đền lớn", "Núi cao đường lớn", "Trời xanh mây trắng", "Vua Hùng vĩ đại"],
                correct: 1,
                explanation: "'Cao sơn cảnh hành' nghĩa là 'Núi cao đường lớn'."
            }
        ],
        guideMessage: "Đây là Cổng Đền Hùng - nơi bắt đầu hành trình! Từ đây có 495 bậc đá để lên đỉnh núi đó các bạn!"
    },

    "den-ha": {
        id: "den-ha",
        number: 2,
        name: "Đền Hạ",
        image: "images/den_ha.png",
        realImage: "images/anhngoai/Đền Hạ.png",
        audio: "giongdoc/Đền Hạ.mp3",
        vr360Image: null, // Legacy field - not used
        vrStreetView: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d56507.823047276484!2d105.25472844863279!3d21.366941900000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31349223310aed35%3A0xc2395308e6d79544!2zxJDhu4FuIEjDuW5n!5e1!3m2!1svi!2s!4v1770485006432!5m2!1svi!2s", // Real Google Maps embed
        description: `Đền Hạ nằm trên núi Nghĩa Lĩnh, là nơi đầu tiên thờ các Vua Hùng. 
Theo truyền thuyết, đây là nơi Tổ mẫu Âu Cơ sinh ra bọc trăm trứng, nở thành 100 người con trai. 
50 con theo cha Lạc Long Quân xuống biển, 50 con theo mẹ Âu Cơ lên núi. 
Người con cả lên làm vua, lấy hiệu là Hùng Vương - vị vua đầu tiên của nước ta!`,
        quiz: [
            {
                question: "Mẹ Âu Cơ sinh ra bao nhiêu người con?",
                options: ["50 người", "100 người", "200 người", "1000 người"],
                correct: 1,
                explanation: "Mẹ Âu Cơ sinh ra bọc trăm trứng, nở thành 100 người con trai."
            },
            {
                question: "Bao nhiêu con theo cha xuống biển?",
                options: ["10 con", "25 con", "50 con", "100 con"],
                correct: 2,
                explanation: "50 con theo cha Lạc Long Quân xuống biển, 50 con theo mẹ lên núi."
            },
            {
                question: "Vị vua đầu tiên của nước ta có hiệu là gì?",
                options: ["Lạc Vương", "Hùng Vương", "Long Vương", "Âu Vương"],
                correct: 1,
                explanation: "Người con cả lên làm vua, lấy hiệu là Hùng Vương."
            }
        ],
        guideMessage: "Đền Hạ là nơi mẹ Âu Cơ sinh bọc trăm trứng đấy! Chúng ta là con cháu của Lạc Long Quân và Âu Cơ!"
    },

    "chua-thien-quang": {
        id: "chua-thien-quang",
        number: 3,
        name: "Chùa Thiên Quang",
        image: "images/bao_tang.png",
        realImage: "images/anhngoai/Chùa Thiên Quang.png",
        audio: "giongdoc/Chùa Thiên Quang.mp3",
        vr360Image: null, // Legacy field - not used
        vrStreetView: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d56507.823047276484!2d105.25472844863279!3d21.366941900000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31349223310aed35%3A0xc2395308e6d79544!2zxJDhu4FuIEjDuW5n!5e1!3m2!1svi!2s!4v1770485006432!5m2!1svi!2s", // Real Google Maps embed
        description: `Chùa Thiên Quang nằm cạnh Đền Hạ, còn được gọi là Chùa Hùng hoặc Chùa Trung.
Chùa được xây dựng từ thời nhà Trần (khoảng 700 năm trước). 
"Thiên Quang" có nghĩa là "Ánh sáng trời". 
Trong chùa có cây vạn tuế hơn 700 tuổi, cao gần 10 mét - đó là một trong những cây vạn tuế cổ thụ nhất Việt Nam!`,
        quiz: [
            {
                question: "'Thiên Quang' có nghĩa là gì?",
                options: ["Bầu trời xanh", "Ánh sáng trời", "Mây trắng", "Trăng sáng"],
                correct: 1,
                explanation: "'Thiên Quang' có nghĩa là 'Ánh sáng trời'."
            },
            {
                question: "Chùa Thiên Quang được xây dựng vào thời nào?",
                options: ["Thời Lý", "Thời Trần", "Thời Lê", "Thời Nguyễn"],
                correct: 1,
                explanation: "Chùa được xây dựng từ thời nhà Trần, khoảng 700 năm trước."
            },
            {
                question: "Cây vạn tuế trong chùa bao nhiêu tuổi?",
                options: ["100 tuổi", "300 tuổi", "500 tuổi", "Hơn 700 tuổi"],
                correct: 3,
                explanation: "Cây vạn tuế trong chùa đã hơn 700 tuổi!"
            }
        ],
        guideMessage: "Chùa Thiên Quang có cây vạn tuế 700 tuổi luôn đó! Cây còn già hơn cả ông bà cố của chúng ta nữa!"
    },

    "den-trung": {
        id: "den-trung",
        number: 4,
        name: "Đền Trung",
        image: "images/den_trung.png",
        realImage: "images/anhngoai/Đền Trung.png",
        audio: "giongdoc/Đền Trung.mp3",
        vr360Image: null, // Legacy field - not used
        vrStreetView: "https://www.google.com/maps/embed?pb=!4v1770485182519!6m8!1m7!1sCAoSFkNJSE0wb2dLRUlDQWdJREVfLUxPRkE.!2m2!1d21.36761659982279!2d105.3219283308694!3f18.001079235253222!4f8.207601111792314!5f0.4000000000000002", // Real Street View 360 - Den Trung
        description: `Đền Trung còn gọi là "Hùng Vương tổ miếu" - nơi các Vua Hùng cùng lạc hầu, lạc tướng bàn việc nước.
Đây cũng là nơi diễn ra cuộc thi tìm người kế vị của Hùng Vương thứ 6.
Trong cuộc thi, 20 chàng hoàng tử đã thi nhau tìm món ngon dâng vua. Lang Liêu - hoàng tử nghèo nhất - đã làm bánh chưng, bánh giầy và giành chiến thắng!`,
        quiz: [
            {
                question: "Đền Trung còn có tên gọi khác là gì?",
                options: ["Đền Lớn", "Hùng Vương tổ miếu", "Đền Vua", "Đền Cổ"],
                correct: 1,
                explanation: "Đền Trung còn gọi là 'Hùng Vương tổ miếu'."
            },
            {
                question: "Ai đã thắng cuộc thi tìm người kế vị?",
                options: ["Hoàng tử cả", "Lang Liêu", "Sơn Tinh", "Thánh Gióng"],
                correct: 1,
                explanation: "Lang Liêu - hoàng tử nghèo nhất - đã làm bánh chưng, bánh giầy và giành chiến thắng!"
            },
            {
                question: "Lang Liêu đã làm món gì để dâng vua?",
                options: ["Xôi gấc", "Bánh chưng, bánh giầy", "Phở", "Cơm tấm"],
                correct: 1,
                explanation: "Lang Liêu đã làm bánh chưng (vuông - tượng trưng Đất) và bánh giầy (tròn - tượng trưng Trời)."
            }
        ],
        guideMessage: "Đền Trung là nơi Lang Liêu thắng cuộc thi làm bánh chưng bánh giầy đấy! Đó là nguồn gốc của Tết Nguyên Đán!"
    },

    "den-thuong": {
        id: "den-thuong",
        number: 5,
        name: "Đền Thượng",
        image: "images/den_thuong.png",
        realImage: "images/anhngoai/Đền Thượng.png",
        audio: "giongdoc/Đền Thượng.mp3",
        vr360Image: null, // Legacy field - not used
        vrStreetView: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d56507.823047276484!2d105.25472844863279!3d21.366941900000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31349223310aed35%3A0xc2395308e6d79544!2zxJDhu4FuIEjDuW5n!5e1!3m2!1svi!2s!4v1770485006432!5m2!1svi!2s", // Real Google Maps embed
        description: `Đền Thượng nằm trên đỉnh núi Nghĩa Lĩnh, cao 175 mét so với mực nước biển.
Đây là nơi linh thiêng nhất, thờ Trời, Đất và các Vua Hùng.
Tương truyền, các Vua Hùng thường lên đây cầu trời cho mưa thuận gió hòa, mùa màng bội thu.
Trước đền có cây Thiên tuế (cây vạn tuế) cổ thụ và bia đá ghi công các Vua Hùng.`,
        quiz: [
            {
                question: "Đền Thượng nằm ở độ cao bao nhiêu?",
                options: ["75 mét", "125 mét", "175 mét", "275 mét"],
                correct: 2,
                explanation: "Đền Thượng nằm trên đỉnh núi Nghĩa Lĩnh, cao 175 mét so với mực nước biển."
            },
            {
                question: "Đền Thượng thờ ai?",
                options: ["Chỉ Vua Hùng", "Trời Đất và các Vua Hùng", "Phật", "Mẹ Âu Cơ"],
                correct: 1,
                explanation: "Đền Thượng thờ Trời, Đất và các Vua Hùng."
            },
            {
                question: "Các Vua Hùng lên Đền Thượng để làm gì?",
                options: ["Nghỉ ngơi", "Cầu mưa thuận gió hòa", "Xem phong cảnh", "Tổ chức lễ hội"],
                correct: 1,
                explanation: "Các Vua Hùng thường lên đây cầu trời cho mưa thuận gió hòa, mùa màng bội thu."
            }
        ],
        guideMessage: "Đền Thượng ở trên đỉnh núi cao nhất đấy! Đây là nơi linh thiêng nhất để thờ các Vua Hùng!"
    },

    "den-gieng": {
        id: "den-gieng",
        number: 6,
        name: "Đền Giếng",
        image: "images/den_gieng.png",
        realImage: "images/anhngoai/Đền giếng.png",
        audio: "giongdoc/Đền Giếng.mp3",
        vr360Image: null, // Legacy field - not used
        vrStreetView: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d56507.823047276484!2d105.25472844863279!3d21.366941900000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31349223310aed35%3A0xc2395308e6d79544!2zxJDhu4FuIEjDuW5n!5e1!3m2!1svi!2s!4v1770485006432!5m2!1svi!2s", // Real Google Maps embed
        description: `Đền Giếng nằm ở chân núi Nghĩa Lĩnh, thờ hai công chúa Tiên Dung và Ngọc Hoa - con gái của Hùng Vương thứ 18.
Trong đền có giếng Ngọc - nơi hai công chúa thường soi gương và chải tóc.
Nước giếng trong vắt và mát lành quanh năm.
Người dân tin rằng, ai uống nước giếng này sẽ được đẹp người đẹp nết!`,
        quiz: [
            {
                question: "Đền Giếng thờ ai?",
                options: ["Vua Hùng", "Hai công chúa", "Mẹ Âu Cơ", "Lạc Long Quân"],
                correct: 1,
                explanation: "Đền Giếng thờ hai công chúa Tiên Dung và Ngọc Hoa."
            },
            {
                question: "Hai công chúa là con của Vua Hùng thứ mấy?",
                options: ["Thứ 1", "Thứ 6", "Thứ 18", "Thứ 20"],
                correct: 2,
                explanation: "Tiên Dung và Ngọc Hoa là con gái của Hùng Vương thứ 18."
            },
            {
                question: "Giếng Ngọc có đặc điểm gì?",
                options: ["Nước nóng", "Nước trong mát quanh năm", "Nước mặn", "Nước có màu vàng"],
                correct: 1,
                explanation: "Nước giếng trong vắt và mát lành quanh năm."
            }
        ],
        guideMessage: "Đền Giếng có giếng Ngọc đó! Ngày xưa công chúa hay soi gương ở đây. Nước trong vắt lắm!"
    },

    "lang-hung-vuong": {
        id: "lang-hung-vuong",
        number: 7,
        name: "Lăng Hùng Vương",
        image: "images/lang_vua_hung.png",
        realImage: "images/anhngoai/Lăng Vua Hùng.png",
        audio: "giongdoc/Lăng Vua Hùng.mp3",
        vr360Image: null, // Legacy field - not used
        vrStreetView: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d56507.823047276484!2d105.25472844863279!3d21.366941900000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31349223310aed35%3A0xc2395308e6d79544!2zxJDhu4FuIEjDuW5n!5e1!3m2!1svi!2s!4v1770485006432!5m2!1svi!2s", // Real Google Maps embed
        description: `Lăng Hùng Vương nằm gần Đền Thượng, là nơi an nghỉ của Hùng Vương thứ 6.
Lăng có hình vuông, mái cong, được xây bằng đá xanh.
Trước lăng có Cột Đá Thề - nơi An Dương Vương (người nhận ngôi từ Hùng Vương thứ 18) đã thề sẽ giữ gìn đất nước.
Hằng năm vào ngày Giỗ Tổ Hùng Vương (10/3 âm lịch), hàng triệu người Việt về đây dâng hương tưởng nhớ!`,
        quiz: [
            {
                question: "Lăng Hùng Vương là nơi an nghỉ của ai?",
                options: ["Hùng Vương thứ 1", "Hùng Vương thứ 6", "Hùng Vương thứ 18", "Tất cả các Vua Hùng"],
                correct: 1,
                explanation: "Lăng Hùng Vương là nơi an nghỉ của Hùng Vương thứ 6."
            },
            {
                question: "Ai đã lập Cột Đá Thề?",
                options: ["Hùng Vương", "Lạc Long Quân", "An Dương Vương", "Thánh Gióng"],
                correct: 2,
                explanation: "An Dương Vương đã lập Cột Đá Thề, thề sẽ giữ gìn đất nước."
            },
            {
                question: "Giỗ Tổ Hùng Vương diễn ra vào ngày nào?",
                options: ["1/1 âm lịch", "15/1 âm lịch", "10/3 âm lịch", "15/8 âm lịch"],
                correct: 2,
                explanation: "Giỗ Tổ Hùng Vương diễn ra vào ngày 10/3 âm lịch hằng năm."
            }
        ],
        guideMessage: "Lăng Hùng Vương và Cột Đá Thề rất quan trọng! Mỗi năm triệu người về đây vào ngày 10/3 âm lịch!"
    },

    "den-au-co": {
        id: "den-au-co",
        number: 8,
        name: "Đền Mẫu Âu Cơ",
        image: "images/den_mau_au_co.png",
        realImage: "images/anhngoai/Đền tổ mẫu Âu Cơ.png",
        audio: "giongdoc/Đền tổ mẫu Âu Cơ.mp3",
        vr360Image: null, // Legacy field - not used
        vrStreetView: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d56507.823047276484!2d105.25472844863279!3d21.366941900000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31349223310aed35%3A0xc2395308e6d79544!2zxJDhu4FuIEjDuW5n!5e1!3m2!1svi!2s!4v1770485006432!5m2!1svi!2s", // Real Google Maps embed
        description: `Đền Tổ Mẫu Âu Cơ thờ mẹ Âu Cơ - Tổ Mẫu của người Việt.
Theo truyền thuyết, Âu Cơ là tiên nữ xinh đẹp, kết hôn với Lạc Long Quân - vua của vùng biển.
Bà sinh ra bọc trăm trứng, nở thành 100 người con trai khỏe mạnh.
Người Việt Nam chúng ta đều là "con Rồng cháu Tiên" - con cháu của Lạc Long Quân và Âu Cơ!`,
        quiz: [
            {
                question: "Mẹ Âu Cơ được gọi là gì?",
                options: ["Tổ Phụ", "Tổ Mẫu", "Nữ Vương", "Hoàng Hậu"],
                correct: 1,
                explanation: "Mẹ Âu Cơ được gọi là 'Tổ Mẫu' - người mẹ tổ tiên của dân tộc Việt."
            },
            {
                question: "Lạc Long Quân là vua của vùng nào?",
                options: ["Vùng núi", "Vùng biển", "Vùng đồng bằng", "Vùng sa mạc"],
                correct: 1,
                explanation: "Lạc Long Quân là vua của vùng biển."
            },
            {
                question: "'Con Rồng cháu Tiên' ý chỉ điều gì?",
                options: ["Người Việt thích rồng", "Người Việt là con cháu Lạc Long Quân và Âu Cơ", "Người Việt biết bay", "Người Việt sống dưới nước"],
                correct: 1,
                explanation: "Người Việt là 'con Rồng cháu Tiên' - con cháu của Lạc Long Quân (Rồng) và Âu Cơ (Tiên)."
            }
        ],
        guideMessage: "Đền thờ mẹ Âu Cơ - mẹ của dân tộc Việt! Chúng ta là con Rồng cháu Tiên đó các bạn!"
    }
};

/* =============================================
   GUIDE MESSAGES
   ============================================= */
const GUIDE_MESSAGES = {
    welcome: "Xin chào các bạn nhỏ! Mình là Chim Lạc, hôm nay mình sẽ dẫn các bạn đi tham quan Đền Hùng - nơi thờ các Vua Hùng, những vị vua đầu tiên của đất nước Việt Nam!",
    start: "Hãy click vào các bức tranh để tìm hiểu về từng địa điểm nhé! Mỗi nơi đều có câu chuyện thú vị đang chờ các bạn!",
    quizStart: "Làm quiz để kiểm tra kiến thức nào! Mỗi câu đúng sẽ được 10 điểm đó!",
    quizCorrect: ["Giỏi quá! Đúng rồi!", "Tuyệt vời! Bạn thông minh lắm!", "Chính xác! Xuất sắc!"],
    quizWrong: ["Ồ, chưa đúng rồi! Thử lại nhé!", "Cố lên! Đáp án khác mới đúng!", "Sai mất rồi, nhưng không sao!"],
    allCompleted: "Chúc mừng! Bạn đã tham quan hết 8 địa điểm! Bạn đã biết thêm nhiều điều về lịch sử Vua Hùng rồi!",
    encouragement: ["Tiếp tục khám phá nhé!", "Còn nhiều điều thú vị lắm!", "Bạn đang làm rất tốt!"]
};

/* =============================================
   SOUND EFFECTS CONFIGURATION
   ============================================= */
const SOUND_EFFECTS = {
    click: "assets/audio/click.mp3",
    correct: "assets/audio/correct.mp3",
    wrong: "assets/audio/wrong.mp3",
    celebrate: "assets/audio/celebrate.mp3"
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LOCATIONS_DATA, GUIDE_MESSAGES, SOUND_EFFECTS };
}
