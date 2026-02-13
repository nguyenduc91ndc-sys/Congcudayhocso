/* =============================================
   CHATBOT - HƯỚNG DẪN VIÊN ẢO ĐỀN HÙNG
   FAQ + AI-style keyword matching
   ============================================= */

// Knowledge Base - Dữ liệu về Đền Hùng
const KNOWLEDGE_BASE = {
    general: `Đền Hùng tọa lạc tại núi Nghĩa Lĩnh cao 175 mét, thuộc xã Hy Cương, tỉnh Phú Thọ. Đền Hùng gắn liền với nguồn gốc và sự hình thành của dân tộc Việt Nam. Khu di tích lịch sử Đền Hùng có tổng diện tích 845 héc-ta với 4 đền, 1 chùa và 1 lăng.`,

    congDen: `Cổng đền của Đền Hùng được xây dựng năm 1917 (Khải Định thứ 2). Cổng có hình vòm cuốn cao 8,5m, gồm hai tầng tám mái, lợp giả ngói ống. 4 góc tầng mái trang trí hình Rồng và đắp nổi hai con Nghê. Giữa tầng 1 có bức đại tự đề 4 chữ "Cao sơn cảnh hành", nghĩa là "lên núi cao nhìn xa rộng".`,

    denHa: `Đền Hạ được xây dựng khoảng thế kỷ XVII-XVIII, là nơi mẹ Âu Cơ sinh ra bọc trăm trứng. Kiến trúc đền theo hình chữ "nhị", gồm hai tòa tiền bái và hậu cung. Ngay chân đền là nhà bia hình lục giác ghi lời dặn của Bác Hồ: "Các Vua Hùng đã có công dựng nước – Bác cháu ta phải cùng nhau giữ lấy nước".`,

    chuaThienQuang: `Chùa Thiên Quang nằm kề bên đền Hạ, ở độ cao 80m. Xưa có tên là Sơn Cảnh Thừa Long Tự. Chùa thờ Phật theo phái Đại Thừa với trên 30 pho tượng. Tháng 9/1954, Bác Hồ đã ngồi nghỉ bên gốc cây thiên tuế và căn dặn: "Các vua Hùng đã có công dựng nước, Bác cháu ta phải cùng nhau giữ lấy nước".`,

    denTrung: `Đền Trung còn gọi là Hùng Vương Tổ miếu, là nơi các Vua Hùng ngắm cảnh và luận bàn việc nước. Đây cũng là nơi gắn liền với sự tích vua Hùng thứ 6 truyền ngôi cho Lang Liêu - vị hoàng tử đã làm ra bánh chưng bánh dày. Đền có kiến trúc kiểu chữ "nhất" với 3 gian.`,

    denThuong: `Đền Thượng là đền cao nhất trong quần thể Đền Hùng, nằm trên đỉnh núi. Tên chữ là Kính Thiên Lĩnh điện. Tương truyền đây là nơi các vua Hùng tế trời đất và thần lúa để cầu mưa thuận gió hòa. Đền có kiến trúc kiểu chữ "vương", gồm 4 cấp: nhà chuông trống, đại bái, tiền tế và hậu cung.`,

    langVuaHung: `Lăng Vua Hùng tương truyền là mộ của Vua Hùng thứ 6 - người đã lãnh đạo nhân dân chống giặc Ân. Lăng nằm phía đông Đền Thượng, có vị trí "đầu đội sơn, chân đạp thủy". Lăng hình vuông, có đao cong 8 góc, tạo thành 2 tầng mái. Xưa là mộ đất, năm 1870 được xây mộ dựng lăng.`,

    denGieng: `Đền Giếng có tên chữ là Ngọc Tỉnh, là nơi hai công chúa Tiên Dung và Ngọc Hoa (con vua Hùng thứ 18) thường soi gương, vấn tóc. Hai bà có công dạy dân trồng lúa nước và trị thủy. Đền được xây dựng khoảng thế kỷ XVIII, kiến trúc kiểu chữ "công".`,

    denAuCo: `Đền Tổ mẫu Âu Cơ xây dựng năm 2001, khánh thành 2004, nằm trên núi Vặn. Đường lên đền có 553 bậc đá. Trong đền đặt tượng thờ Mẹ Âu Cơ và các Lạc hầu, Lạc tướng. Theo truyền thuyết, mẹ Âu Cơ sinh ra bọc trăm trứng, nở thành 100 người con, 50 theo cha Lạc Long Quân xuống biển, 50 theo mẹ lên núi.`,

    denLacLongQuan: `Đền thờ Quốc Tổ Lạc Long Quân khởi công năm 2006, khánh thành 2009, tọa lạc tại núi Sim. Đền có kiến trúc kiểu chữ "đinh", sử dụng gỗ lim, sơn son thếp vàng. Lạc Long Quân là cha của dân tộc Việt Nam, kết hôn với mẹ Âu Cơ sinh ra bọc trăm trứng.`,

    giengCo: `Giếng cổ (Giếng Rồng) nằm ở lối từ đền Thượng xuống đền Giếng. Tương truyền đây là nơi Tổ Mẫu Âu Cơ dùng nước tắm cho các con sau khi sinh bọc trăm trứng. Giếng có đường kính khoảng hơn 2m, thành giếng được ốp đá.`,

    baoTang: `Bảo tàng Hùng Vương được xây dựng từ 1996-2003, thiết kế theo quan niệm trời tròn đất vuông phỏng theo truyền thuyết bánh Chưng bánh Dày. Bảo tàng trưng bày các hiện vật về chủ đề "Các Vua Hùng dựng nước Văn Lang trên mảnh đất Phong Châu lịch sử" <span style="font-size:0.85em;color:#888">(nay là xã Hy Cương, tỉnh Phú Thọ)</span>. Hiện lưu giữ 700 hiện vật gốc trên tổng số 4000 hiện vật.`,

    vuaHung: `Các vị vua Hùng được xem là những người sáng lập quốc gia Văn Lang và góp phần thống nhất bộ tộc. Theo truyền thuyết, Hùng Vương là con của Lạc Long Quân và Âu Cơ. Có 18 đời vua Hùng cai trị nước Văn Lang. Ngày 10/3 âm lịch hàng năm là ngày Giỗ Tổ Hùng Vương - ngày lễ quốc gia.`,

    thanhGiong: `Thánh Gióng gắn liền với đời vua Hùng thứ 6. Khi giặc Ân xâm lược, cậu bé làng Phù Đổng vươn vai thành tráng sĩ, cưỡi ngựa sắt đánh tan giặc, rồi cả người lẫn ngựa bay lên trời. Sự tích này gắn liền với đền Thượng nơi vua Hùng lập đàn cầu người tài cứu nước.`,

    banhChungBanhDay: `Sự tích bánh Chưng bánh Dày gắn với đền Trung. Vua Hùng thứ 6 muốn truyền ngôi cho người con làm được món ăn ngon lạ. Lang Liêu được thần báo mộng làm bánh Chưng (vuông, tượng trưng đất) và bánh Dày (tròn, tượng trưng trời). Nhờ đó Lang Liêu được truyền ngôi.`
};

// FAQ - Câu hỏi thường gặp
const FAQ_QUESTIONS = [
    {
        question: "Đền Hùng ở đâu?",
        answer: "Đền Hùng tọa lạc tại núi Nghĩa Lĩnh cao 175 mét, thuộc xã Hy Cương, tỉnh Phú Thọ. Đây là một trong những điểm du lịch lịch sử và văn hóa nổi tiếng nhất Việt Nam."
    },
    {
        question: "Đền Hùng có bao nhiêu đền?",
        answer: "Khu di tích lịch sử Đền Hùng có tổng diện tích 845 héc-ta, gồm 4 đền chính (Đền Hạ, Đền Trung, Đền Thượng, Đền Giếng), 1 chùa (Chùa Thiên Quang) và 1 lăng (Lăng Vua Hùng). Ngoài ra còn có Đền Tổ Mẫu Âu Cơ và Đền Quốc Tổ Lạc Long Quân."
    },
    {
        question: "Ngày Giỗ Tổ Hùng Vương là ngày nào?",
        answer: "Ngày Giỗ Tổ Hùng Vương là ngày 10 tháng 3 âm lịch hàng năm. Đây là ngày lễ quốc gia, người dân cả nước hướng về Đền Hùng để tưởng nhớ công lao các Vua Hùng đã có công dựng nước."
    },
    {
        question: "Cổng Đền Hùng cao bao nhiêu?",
        answer: "Cổng Đền Hùng được xây dựng năm 1917, có hình vòm cuốn cao 8,5 mét, gồm hai tầng tám mái. Trên cổng có đề 4 chữ 'Cao sơn cảnh hành' nghĩa là 'lên núi cao nhìn xa rộng'."
    },
    {
        question: "Đền Hạ thờ ai?",
        answer: "Đền Hạ là nơi thờ Mẹ Âu Cơ - người đã sinh ra bọc trăm trứng. Phía sau đền ngày nay vẫn còn dấu tích của giếng 'Mắt Rồng' - nơi mẹ Âu Cơ ấp trứng khi xưa."
    },
    {
        question: "Bác Hồ nói gì khi thăm Đền Hùng?",
        answer: "Khi thăm Đền Hùng ngày 19/09/1954, Bác Hồ đã căn dặn: 'Các Vua Hùng đã có công dựng nước – Bác cháu ta phải cùng nhau giữ lấy nước'. Lời dặn này được khắc trên bia đá tại nhà bia ở chân Đền Hạ."
    },
    {
        question: "Sự tích bánh Chưng bánh Dày gắn với đền nào?",
        answer: "Sự tích bánh Chưng bánh Dày gắn liền với Đền Trung. Đây là nơi vua Hùng thứ 6 truyền ngôi cho Lang Liêu - vị hoàng tử đã làm ra bánh Chưng (vuông) và bánh Dày (tròn) theo ý nghĩa trời tròn đất vuông."
    },
    {
        question: "Thánh Gióng có liên quan gì đến Đền Hùng?",
        answer: "Thời vua Hùng thứ 6, giặc Ân xâm lược, cậu bé làng Phù Đổng (Thánh Gióng) vươn vai thành tráng sĩ đánh thắng giặc rồi bay về trời. Vua cho lập đền thờ vọng trên đỉnh núi - chính là Đền Thượng ngày nay."
    },
    {
        question: "Đền Giếng có đặc điểm gì?",
        answer: "Đền Giếng (Ngọc Tỉnh) là nơi hai công chúa Tiên Dung và Ngọc Hoa - con vua Hùng thứ 18 - thường soi gương, vấn tóc. Hai bà có công dạy dân trồng lúa nước và trị thủy nên được thờ phụng tại đây."
    },
    {
        question: "Lăng Vua Hùng là mộ của ai?",
        answer: "Lăng Vua Hùng tương truyền là mộ của Vua Hùng thứ 6 - vị vua đã lãnh đạo nhân dân chống giặc Ân. Lăng nằm phía đông Đền Thượng, có vị trí 'đầu đội sơn, chân đạp thủy', hình vuông với đao cong 8 góc."
    }
];

// Keywords mapping cho AI-style response
const KEYWORD_MAPPING = {
    'cổng': 'congDen',
    'cổng đền': 'congDen',
    'cong den': 'congDen',

    'đền hạ': 'denHa',
    'den ha': 'denHa',
    'âu cơ sinh': 'denHa',
    'bọc trăm trứng': 'denHa',

    'chùa': 'chuaThienQuang',
    'thiên quang': 'chuaThienQuang',
    'thien quang': 'chuaThienQuang',

    'đền trung': 'denTrung',
    'den trung': 'denTrung',
    'lang liêu': 'denTrung',
    'bánh chưng': 'banhChungBanhDay',
    'bánh dày': 'banhChungBanhDay',
    'banh chung': 'banhChungBanhDay',

    'đền thượng': 'denThuong',
    'den thuong': 'denThuong',
    'đỉnh núi': 'denThuong',
    'đền cao nhất': 'denThuong',

    'lăng': 'langVuaHung',
    'lang vua': 'langVuaHung',
    'mộ vua': 'langVuaHung',

    'đền giếng': 'denGieng',
    'den gieng': 'denGieng',
    'tiên dung': 'denGieng',
    'ngọc hoa': 'denGieng',
    'công chúa': 'denGieng',

    'mẹ âu cơ': 'denAuCo',
    'đền âu cơ': 'denAuCo',
    'tổ mẫu': 'denAuCo',

    'lạc long quân': 'denLacLongQuan',
    'quốc tổ': 'denLacLongQuan',
    'cha lạc long': 'denLacLongQuan',

    'giếng cổ': 'giengCo',
    'giếng rồng': 'giengCo',

    'bảo tàng': 'baoTang',
    'bao tang': 'baoTang',

    'vua hùng': 'vuaHung',
    'hùng vương': 'vuaHung',
    'văn lang': 'vuaHung',
    'giỗ tổ': 'vuaHung',
    '10/3': 'vuaHung',
    '10 tháng 3': 'vuaHung',

    'thánh gióng': 'thanhGiong',
    'thanh giong': 'thanhGiong',
    'giặc ân': 'thanhGiong',
    'phù đổng': 'thanhGiong',

    'đền hùng': 'general',
    'den hung': 'general',
    'ở đâu': 'general',
    'diện tích': 'general',
    'núi nghĩa lĩnh': 'general'
};

// Chatbot Class
class DenHungChatbot {
    constructor() {
        this.isOpen = false;
        this.currentMode = 'faq'; // 'faq' or 'ai'
        this.chatHistory = [];

        this.createChatUI();
        this.setupEventListeners();
    }

    createChatUI() {
        // Chat Container
        const chatContainer = document.createElement('div');
        chatContainer.id = 'chatbot-container';
        chatContainer.className = 'chatbot-container';
        chatContainer.innerHTML = `
            <!-- Chat Toggle Button -->
            <button id="chat-toggle" class="chat-toggle" title="Hỏi đáp về Đền Hùng">
                <span class="chat-icon">💬</span>
                <span class="chat-hint">Hãy hỏi tôi!</span>
            </button>
            
            <!-- Chat Window -->
            <div id="chat-window" class="chat-window hidden">
                <div class="chat-header">
                    <div class="chat-title">
                        <span class="chat-avatar">🐦</span>
                        <span>Chim Lạc - Hướng dẫn viên</span>
                    </div>
                    <button id="chat-close" class="chat-close">✕</button>
                </div>
                
                <!-- Mode Tabs -->
                <div class="chat-tabs">
                    <button class="chat-tab active" data-mode="faq">
                        📋 Câu hỏi thường gặp
                    </button>
                    <button class="chat-tab" data-mode="ai">
                        🤖 Hỏi tự do
                    </button>
                </div>
                
                <!-- Chat Body -->
                <div class="chat-body" id="chat-body">
                    <!-- Messages will appear here -->
                    <div class="chat-welcome">
                        <div class="welcome-avatar">🐦</div>
                        <p>Xin chào! Mình là Chim Lạc. Hãy chọn câu hỏi bên dưới hoặc chuyển sang tab "Hỏi tự do" để đặt câu hỏi về Đền Hùng nhé!</p>
                    </div>
                </div>
                
                <!-- FAQ Questions (shown in FAQ mode) -->
                <div class="faq-container" id="faq-container">
                    <div class="faq-list" id="faq-list">
                        <!-- FAQ buttons will be generated here -->
                    </div>
                </div>
                
                <!-- Input (shown in AI mode) -->
                <div class="chat-input-container hidden" id="chat-input-container">
                    <input type="text" id="chat-input" class="chat-input" placeholder="Nhập câu hỏi về Đền Hùng...">
                    <button id="chat-send" class="chat-send">➤</button>
                </div>
            </div>
        `;

        document.body.appendChild(chatContainer);

        // Generate FAQ buttons
        this.generateFAQButtons();
    }

    generateFAQButtons() {
        const faqList = document.getElementById('faq-list');
        FAQ_QUESTIONS.forEach((faq, index) => {
            const btn = document.createElement('button');
            btn.className = 'faq-btn';
            btn.textContent = faq.question;
            btn.dataset.index = index;
            btn.addEventListener('click', () => this.handleFAQClick(index));
            faqList.appendChild(btn);
        });
    }

    setupEventListeners() {
        // Toggle chat
        document.getElementById('chat-toggle').addEventListener('click', () => this.toggleChat());
        document.getElementById('chat-close').addEventListener('click', () => this.closeChat());

        // Tab switching
        document.querySelectorAll('.chat-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // AI input
        document.getElementById('chat-send').addEventListener('click', () => this.sendMessage());
        document.getElementById('chat-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const chatWindow = document.getElementById('chat-window');
        const chatToggle = document.getElementById('chat-toggle');

        if (this.isOpen) {
            chatWindow.classList.remove('hidden');
            chatToggle.classList.add('active');
        } else {
            chatWindow.classList.add('hidden');
            chatToggle.classList.remove('active');
        }
    }

    closeChat() {
        this.isOpen = false;
        document.getElementById('chat-window').classList.add('hidden');
        document.getElementById('chat-toggle').classList.remove('active');
    }

    switchMode(mode) {
        this.currentMode = mode;

        // Update tabs
        document.querySelectorAll('.chat-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });

        // Toggle containers
        const faqContainer = document.getElementById('faq-container');
        const inputContainer = document.getElementById('chat-input-container');

        if (mode === 'faq') {
            faqContainer.classList.remove('hidden');
            inputContainer.classList.add('hidden');
        } else {
            faqContainer.classList.add('hidden');
            inputContainer.classList.remove('hidden');
            document.getElementById('chat-input').focus();
        }
    }

    handleFAQClick(index) {
        const faq = FAQ_QUESTIONS[index];
        this.addMessage(faq.question, 'user');

        setTimeout(() => {
            this.addMessage(faq.answer, 'bot');
        }, 500);
    }

    sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        if (!message) return;

        this.addMessage(message, 'user');
        input.value = '';

        // Process with AI-style response
        setTimeout(() => {
            const response = this.getAIResponse(message);
            this.addMessage(response, 'bot');
        }, 800);
    }

    getAIResponse(query) {
        const lowerQuery = query.toLowerCase();

        // Check keywords
        for (const [keyword, topic] of Object.entries(KEYWORD_MAPPING)) {
            if (lowerQuery.includes(keyword)) {
                return KNOWLEDGE_BASE[topic] || KNOWLEDGE_BASE.general;
            }
        }

        // Default response
        return `Cảm ơn bạn đã hỏi! Đền Hùng là khu di tích lịch sử thiêng liêng gắn liền với nguồn gốc dân tộc Việt Nam. Bạn có thể hỏi về các địa điểm cụ thể như: Cổng đền, Đền Hạ, Chùa Thiên Quang, Đền Trung, Đền Thượng, Lăng Vua Hùng, Đền Giếng, hoặc các truyền thuyết như bánh Chưng bánh Dày, Thánh Gióng, Mẹ Âu Cơ...`;
    }

    addMessage(text, sender) {
        const chatBody = document.getElementById('chat-body');

        // Remove welcome message if exists
        const welcome = chatBody.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;

        if (sender === 'bot') {
            messageDiv.innerHTML = `
                <span class="message-avatar">🐦</span>
                <div class="message-content">${text}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">${text}</div>
            `;
        }

        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;

        this.chatHistory.push({ sender, text });
    }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.chatbot = new DenHungChatbot();
});


