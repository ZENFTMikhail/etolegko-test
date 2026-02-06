# Etolegko Test Project

Проект полностью контейнеризирован через **Docker Compose** — всё запускается одной командой. Swagger документация доступна для API.

etolegko/
│
├─ backend-test/ 
├─ frontend-test/ 
├─ docker-compose.yml 
├─ .env Пример конфигурации окружения не исключен, что бы не дублировать в личку
└─ README.md

## ⚡ Быстрый старт

1. Клонируем репозиторий:

```bash
git clone https://github.com/ZENFTMikhail/etolegko-test
cd etolegko```

2. Запускаем проект через Docker Compose:

docker compose up -d


Backend: http://localhost:3001

Frontend: http://localhost:3000

Swagger документация: http://localhost:3001/api