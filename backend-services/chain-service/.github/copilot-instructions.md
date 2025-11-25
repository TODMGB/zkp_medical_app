<!-- Project-specific Copilot instructions: concise, actionable, and grounded in repo files -->
# ERC4337Service — Copilot instructions

This file gives focused, actionable guidance for AI coding agents working on this codebase. Keep instructions short and always reference the concrete files below.

- Project entry points: `server.js` (HTTP/Express) and `src/rpc/server.js` (gRPC). Read these first to understand startup order: middlewares -> routes -> start gRPC -> start MQ consumers -> listen HTTP.
- Primary folders:
  - `src/routes` — Express routes (see `src/routes/users.routes.js`).
  - `src/controllers` — Thin controllers that validate and call services (e.g. `createUser`, `getUserByIdViaRpc`).
  - `src/services` — Business logic, uses `entity`, `redis`, `mq`, and `rpc/clients` (see `src/services/user.service.js`).
  - `src/entity` — DB access layer (single place for SQL/PG interactions via `pg`).
  - `src/mq` — RabbitMQ producer/consumer patterns; consumers run on service startup (`startConsumers`) and use `topic` exchange with binding keys like `user.created`.
  - `src/rpc` — gRPC server (`proto/user.proto`) and client usage in `src/services/user.service.js`.

- Environment and config: `src/config/index.js` reads env vars (PORT, GRPC_PORT, REDIS_URL, MQ_URL, CORS_ALLOWED_ORIGINS). Use `process.env` for local overrides.

- Common patterns to preserve when editing or adding code:
  - Controllers must not contain SQL or business logic. Keep validation -> call service -> res/next(error).
  - Services handle caching: check Redis first, fall back to `entity` layer, then set cache. Use `redis/client` helper.
  - MQ: when creating entities, prefer publishing an event (`mq/producer.publishUserCreated`) and ack messages in consumers manually (`channel.ack`).
  - gRPC: server exposes `UserService` from `proto/user.proto`; clients live in `src/rpc/clients/*.js`. Prefer using existing client wrappers.

- Developer workflows (from package.json & files):
  - Start locally: `npm start` (runs `node server.js`). Server starts gRPC and MQ consumers automatically.
  - No test runner present — do not add test assumptions; add lightweight unit tests only if you also add scripts to package.json.

- When you modify startup, be careful with order: security middleware then cors, then express.json, then requestLogger, routes, notFoundHandler, errorHandler. Changing order may break logging/error behavior.

- Example quick task templates (be concrete):
  - To add a new HTTP route `/api/users/:id/detail` that returns DB+RPC merged data:
    - Add route in `src/routes/users.routes.js`.
    - Add controller in `src/controllers/user.controller.js` that calls a new service method.
    - Implement service in `src/services/user.service.js`: call `findUserById`, call `findUserByIdViaRpc`, merge results, return.
  - To add a consumer for `user.updated`:
    - Add binding key in `src/mq/index.js` bindingKeys array.
    - Add handler in `src/mq/consumers/user.consumer.js`, export it and call from `startConsumers`.

- Error handling and logging:
  - Use `next(error)` in controllers to delegate to `src/middleware/errorHandler.middleware.js`.
  - Use console.log for operational messages (this project uses console in many places).

- Integration notes:
  - RabbitMQ: config in env `MQ_URL`, exchange name in `config.mq.exchangeName` (default `app_events`). Queue names in this service use `user_service_queue`.
  - Redis client is used for caching and expects `REDIS_URL`.
  - Postgres via `pg` is accessed in `src/entity/db.js` and `src/entity/user.entity.js` (follow existing query patterns).

If anything above is unclear or you need examples for a specific change (route, service, rpc client, or mq consumer), ask and I will expand with a concrete code snippet and step-by-step edits.
