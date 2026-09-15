# Domovoi: операционный паспорт

Этот файл описывает текущий контракт и эксплуатацию проекта. Исходный код игры
поддерживает React/Vite/TypeScript, а production API запускается отдельным
серверным приложением на VPS.

## Как собрать проект

В корне репозитория:

```powershell
npm.cmd install
npm.cmd run build
```

Результат сборки находится в `dist/`. Команда `build` запускает TypeScript
typecheck (`tsc -b`) и затем `vite build`.

## Как запустить локально

Frontend в режиме разработки:

```powershell
npm.cmd run dev
```

Локальный legacy API-сервер для серверного тестирования:

```powershell
$env:PORT = "8787"
npm.cmd run server
```

Основной frontend использует production-style маршрут
`/domovoi/api/chat/action`. Для полноценной локальной проверки этот маршрут
должен проксироваться на доступный API-сервер через локальную конфигурацию
Vite или reverse proxy.

## Какой API endpoint используется

Frontend отправляет запрос:

```text
POST /domovoi/api/chat/action
```

На production Nginx проксирует этот путь на Domovoi API, работающий на
`127.0.0.1:3007`.

Health endpoint production API:

```text
GET /healthz
```

Через публичный reverse proxy также используется:

```text
GET /domovoi/api/healthz
```

## Формат запроса

Текущий frontend отправляет JSON:

```json
{
  "recentMessages": [
    {
      "id": "123",
      "author": "Марина Петрова",
      "text": "Кто уже написал в УК?"
    }
  ],
  "currentTension": 15,
  "currentSuspicion": 5,
  "lastPlayerMessage": "Я отправил заявку, ждём ответа.",
  "replyToMessageId": null
}
```

Поля:

- `recentMessages` — последние сообщения, передаваемые Director для контекста;
- `currentTension` — текущий уровень напряжения игры;
- `currentSuspicion` — текущий уровень подозрения;
- `lastPlayerMessage` — новое сообщение игрока;
- `replyToMessageId` — ID сообщения, на которое отвечает игрок, либо `null`.

API-ключ ArionHub в frontend-запрос не передаётся.

## Формат ответа

Успешный ответ `200 OK`:

```json
{
  "actorId": "ludmila",
  "actorName": "Людмила Викторовна (кв. 48)",
  "messageText": "Совесть имейте... давайте сначала факты.",
  "tensionDelta": 3,
  "suspicionDelta": 0,
  "recommendedDelayMs": 3500
}
```

Поля:

- `actorId` — ID выбранного NPC;
- `actorName` — имя, отображаемое в чате;
- `messageText` — одна короткая реплика NPC;
- `tensionDelta` — изменение напряжения;
- `suspicionDelta` — изменение подозрения;
- `recommendedDelayMs` — рекомендуемая задержка перед публикацией реплики.

Frontend ограничивает задержку отображения диапазоном 4–12 секунд и снимает
индикатор печати при ошибке или timeout.

Ошибочный ответ должен иметь HTTP-код ошибки и JSON с полем `error`. Секреты,
API-ключи, системные промпты и внутреннее reasoning в ответ клиенту не входят.

## Какие сервисы есть на VPS

Production VPS:

```text
217.171.146.136
SSH-порт: 2222
```

Сервисы, описанные для окружения:

- `domovoi.service` — Domovoi API на `127.0.0.1:3007`;
- `zhiza.service` — приложение Zhiza на `127.0.0.1:3005`;
- `clsasa-webhook.service` — webhook для обновлений;
- `temki-autopull.timer` — периодическое обновление Temki;
- `nginx` — reverse proxy и раздача production frontend.

Рабочий каталог Domovoi на VPS:

```text
/var/www/clsasa.ru/domovoi-troll
```

Production API запускается из `server.mjs` через `domovoi.service`. Не
предполагать, что production-каталог является Git checkout: в текущем
окружении Git-копия может находиться во вложенном каталоге, а frontend
разворачивается копированием собранного `dist/`.

## Как проверять production

1. Проверить сайт:

   ```powershell
   Invoke-WebRequest https://clsasa.ru/domovoi/ -UseBasicParsing
   ```

2. Проверить health API:

   ```powershell
   Invoke-WebRequest https://clsasa.ru/domovoi/api/healthz -UseBasicParsing
   ```

   Ожидается JSON с `ok: true`, `configured: true` и названиями моделей.

3. Проверить реальный вызов Director/Actor:

   ```powershell
   $body = @{
     recentMessages = @()
     currentTension = 15
     currentSuspicion = 5
     lastPlayerMessage = "Кто сейчас отвечает за ремонт?"
     replyToMessageId = $null
   } | ConvertTo-Json
   Invoke-WebRequest `
     -Uri https://clsasa.ru/domovoi/api/chat/action `
     -Method Post `
     -ContentType "application/json" `
     -Body $body `
     -UseBasicParsing
   ```

   Ожидается `200 OK` с `actorId`, `actorName`, `messageText` и
   `recommendedDelayMs`.

4. На VPS проверить локальный API и сервис:

   ```bash
   curl -sS http://127.0.0.1:3007/healthz
   systemctl is-active domovoi.service
   ss -ltnp | grep ':3007'
   journalctl -u domovoi.service -n 50 --no-pager
   ```

5. После обновления frontend проверить, что `/domovoi/` отдаёт новый JS bundle,
   а в браузере работают выбор аккаунта, переключение чатов, ответ на
   сообщение, typing-индикатор и загрузка изображений.

Если health API не отвечает, ArionHub недоступен или не проходит SSH/DNS/Nginx,
это инфраструктурная проблема для владельца VPS, а не повод переписывать
frontend.

## Что нельзя менять без согласования

- `ARIONHUB_API_KEY`, `.env` и любые секреты;
- Nginx, DNS, SSL и правила reverse proxy;
- unit-файлы systemd и параметры `domovoi.service`;
- production-порт `127.0.0.1:3007`;
- модели Director/Actor и серверный маршрут без проверки контракта;
- формат запроса или ответа `/domovoi/api/chat/action` без явного описания
  миграции;
- серверную ответственность за `tension`, `suspicion`, выбор NPC и состояние
  игры;
- публикацию системных промптов, API-ключей или internal reasoning;
- production-файлы вручную поверх работающего процесса без резервной копии или
  согласованного способа деплоя.

Изменения кода должны проходить `npm.cmd run build`, проверку совместимости
action API, commit и push в GitHub. Обновление VPS выполняется отдельно и
проверяется по health endpoint, service status и реальному запросу Actor.
