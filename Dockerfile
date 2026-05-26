# ── Stage 1 : build frontend ────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Stage 2 : production (nginx + Node.js) ──────────────
FROM node:22-alpine
RUN apk add --no-cache nginx && mkdir -p /etc/nginx/http.d /usr/share/nginx/html

# Backend
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ .

# Frontend statique
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Config nginx — /api/ proxyfié vers Node.js local (port 4000)
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;\n\
    location ^~ /api/ {\n\
        proxy_pass         http://127.0.0.1:4000/;\n\
        proxy_set_header   Host             $host;\n\
        proxy_set_header   X-Real-IP        $remote_addr;\n\
        proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;\n\
    }\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/http.d/default.conf

EXPOSE 80

# nginx en arrière-plan + Node.js au premier plan
CMD sh -c "nginx -g 'daemon off;' & node /app/index.js"