# Sử dụng Node.js bản 18 (Alpine nhẹ và bảo mật)
FROM node:18-alpine

# Thiết lập thư mục làm việc trong máy chủ ảo
WORKDIR /app

# Copy các file quản lý thư viện vào trước
COPY package*.json ./

# Cài đặt các thư viện cần thiết (bao gồm sharp, express, google-genai...)
RUN npm install

# Copy toàn bộ mã nguồn và thư mục data vào máy chủ
COPY . .

# Hugging Face yêu cầu ứng dụng phải chạy trên cổng 7860
EXPOSE 7860

# Báo cho server.js biết để tự động dùng cổng 7860 thay vì 3000
ENV PORT=7860

# Lệnh khởi động máy chủ
CMD ["npm", "start"]
