FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run DB initialization on build
RUN python -c "from database import init_db; init_db()"

ENV PORT=3001
ENV FLASK_HOST=0.0.0.0
ENV FLASK_ENV=production

EXPOSE 3001

CMD ["python", "app.py"]
