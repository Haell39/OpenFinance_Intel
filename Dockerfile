# ============================================================
# OpenFinance Intel — All-in-One Production Dockerfile
# For platforms that deploy a SINGLE container (Railway, Render, Fly.io)
# ============================================================

# --- Stage 1: Build the frontend ---
FROM node:20-alpine AS frontend-build
WORKDIR /app/dashboard
COPY dashboard/package.json dashboard/package-lock.json* ./
RUN npm ci --silent
COPY dashboard/ .
RUN npm run build

# --- Stage 2: Production runtime ---
FROM python:3.11-slim

# Install system deps: Nginx + Supervisor + Redis
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    supervisor \
    redis-server \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# --- Install MongoDB ---
RUN apt-get update && apt-get install -y --no-install-recommends gnupg curl && \
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg && \
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" > /etc/apt/sources.list.d/mongodb-org-7.0.list && \
    apt-get update && apt-get install -y --no-install-recommends mongodb-org && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /data/db

# --- Copy Python services ---
WORKDIR /app

# API
COPY services/api/requirements.txt /app/api/requirements.txt
RUN pip install --no-cache-dir -r /app/api/requirements.txt

# Collector
COPY services/collector/requirements.txt /app/collector/requirements.txt
RUN pip install --no-cache-dir -r /app/collector/requirements.txt

# Analysis
COPY services/analysis/requirements.txt /app/analysis/requirements.txt
RUN pip install --no-cache-dir -r /app/analysis/requirements.txt

# Download spacy model
RUN python -m spacy download pt_core_news_sm || true
RUN python -m spacy download en_core_web_sm || true

# Copy all service code
COPY services/api/app /app/api/app
COPY services/collector/app /app/collector/app
COPY services/analysis/app /app/analysis/app
COPY services/notifier/app /app/notifier/app

# Copy env file if exists (won't fail if missing)
COPY services/.en[v] /app/.env

# --- Copy frontend build from Stage 1 ---
COPY --from=frontend-build /app/dashboard/dist /usr/share/nginx/html
COPY dashboard/public/imgs /usr/share/nginx/html/imgs

# --- Nginx config ---
RUN rm -f /etc/nginx/sites-enabled/default
COPY <<'NGINX_CONF' /etc/nginx/sites-enabled/openfinance.conf
server {
    listen 0.0.0.0:${PORT:-80};
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /events {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /sources {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /narratives {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
}
NGINX_CONF

# --- Supervisor config (manages all processes) ---
COPY <<'SUPERVISOR_CONF' /etc/supervisor/conf.d/openfinance.conf
[supervisord]
nodaemon=true
logfile=/dev/stdout
logfile_maxbytes=0

[program:redis]
command=redis-server --protected-mode no
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:mongodb]
command=mongod --bind_ip_all --dbpath /data/db
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:api]
command=python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
directory=/app/api
environment=MONGO_URI="mongodb://127.0.0.1:27017",MONGO_DB="sentinelwatch",REDIS_HOST="127.0.0.1",REDIS_PORT="6379",TASKS_QUEUE="tasks_queue"
autostart=true
autorestart=true
startsecs=5
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:collector]
command=python -m app.main
directory=/app/collector
environment=REDIS_HOST="127.0.0.1",REDIS_PORT="6379",TASKS_QUEUE="tasks_queue",EVENTS_QUEUE="events_queue"
autostart=true
autorestart=true
startsecs=8
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:analysis]
command=python -m app.main
directory=/app/analysis
environment=MONGO_URI="mongodb://127.0.0.1:27017",MONGO_DB="sentinelwatch",REDIS_HOST="127.0.0.1",REDIS_PORT="6379",EVENTS_QUEUE="events_queue",ALERTS_QUEUE="alerts_queue"
autostart=true
autorestart=true
startsecs=10
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:nginx]
command=nginx -g "daemon off;"
autostart=true
autorestart=true
startsecs=3
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
SUPERVISOR_CONF

# --- Startup script ---
COPY <<'START_SH' /app/start.sh
#!/bin/bash
# Replace PORT in nginx config (Railway injects $PORT)
export PORT=${PORT:-80}
envsubst '${PORT}' < /etc/nginx/sites-enabled/openfinance.conf > /tmp/nginx.conf
mv /tmp/nginx.conf /etc/nginx/sites-enabled/openfinance.conf

exec supervisord -c /etc/supervisor/supervisord.conf
START_SH
RUN chmod +x /app/start.sh

# Railway requires PORT env var
EXPOSE ${PORT:-80}

CMD ["/app/start.sh"]
