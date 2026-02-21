FROM python:3.12-alpine

# Install system dependencies for Archive extraction (bsdtar/p7zip) and Video thumbnails (ffmpeg)
RUN apk add --no-cache ffmpeg libarchive-tools p7zip

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 6979

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "6979"]
