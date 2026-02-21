FROM python:3.12-alpine

# Pillow build deps and Archive/OpenCV deps
RUN apk add --no-cache jpeg-dev zlib-dev gcc musl-dev unrar glib libstdc++

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && apk del gcc musl-dev

COPY . .

EXPOSE 6979

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "6979"]
