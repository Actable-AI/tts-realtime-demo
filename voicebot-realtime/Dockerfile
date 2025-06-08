# Sử dụng Python 3.9 làm base image
FROM python:3.9-slim

# Thiết lập thư mục làm việc
WORKDIR /app

# Sao chép requirements.txt
COPY requirements.txt .

# Cài đặt các dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Sao chép source code
COPY . .

# Expose port 8083
EXPOSE 8083

# Command để chạy ứng dụng
CMD ["uvicorn", "stream_openai_chat:app", "--host", "0.0.0.0", "--port", "8083"] 