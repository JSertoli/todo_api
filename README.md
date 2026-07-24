# todo_api — Autenticação (JWT + Prisma)

API de registro/login para um app de tarefas, em **Clean Architecture** com
Express 5, Prisma 7 (SQLite) e JWT (access + refresh token com rotação).

## Stack

- **Node 24** + **TypeScript** (ESM), executado com **tsx** (sem build)
- **Express 5** — HTTP
- **Prisma 7** + **SQLite** (driver adapter `better-sqlite3`)
- **jsonwebtoken** — access token (JWT) | **bcrypt** — hash de senha
- **zod** — validação de entrada e das variáveis de ambiente

## Arquitetura

Dependências apontam sempre **para dentro** (domínio não conhece infra):

```
src/
├─ domain/                 Regras/contratos — NÃO conhece Express nem Prisma
│  ├─ entities/            user.ts · task.ts · refresh-token.ts
│  └─ ports/               repositories.ts · providers.ts (interfaces)
├─ application/            Casos de uso
│  ├─ auth-service.ts      register / login / refresh / logout
│  └─ tasks-service.ts     CRUD de tarefas (com verificação de dono)
├─ infra/                  ADAPTERS — implementam os ports
│  ├─ prisma.ts            PrismaClient + adapter SQLite
│  ├─ repositories/        prisma-{user,refresh-token,tasks}-repository.ts
│  └─ providers/           bcrypt-hash-provider.ts · jwt-token-provider.ts
├─ http/                   Camada web (Express)
│  ├─ app.ts               createApp(routers) — não conhece services
│  ├─ controllers/         auth-controller.ts · tasks-controller.ts
│  ├─ middlewares/         ensure-authenticated · validate-body · error-handler
│  ├─ routes/              auth.routes.ts · tasks.routes.ts
│  └─ schemas/             auth-schemas.ts · task-schemas.ts (Zod)
├─ errors.ts               AppError genérico (statusCode + message)
├─ config.ts               Env validado (fail-fast)
├─ container.ts            Composition Root (monta o grafo de dependências)
└─ index.ts                Bootstrap (app.listen)
```

**Regra de dependência:** `http/` e `infra/` dependem de `domain/`; o domínio
não depende de ninguém. Trocar SQLite por Postgres, ou bcrypt por argon2, altera
apenas a classe em `infra/` + a linha no `container.ts` — domínio/aplicação não mudam.

**Desacoplamento do app:** cada feature expõe um _router_ (`http/routes/*`). O
`container.ts` instancia as dependências e monta os routers; o `createApp(routers)`
só recebe routers prontos. Adicionar uma feature = criar seus arquivos e registrar
o router no `container.ts` — a assinatura do `createApp` nunca muda.

## Setup

```bash
npm install                 # deps (postinstall roda prisma generate)
cp .env.example .env        # e ajuste o JWT_ACCESS_SECRET
npm run prisma:migrate      # cria o dev.db e aplica as migrations
npm run dev                 # sobe em http://localhost:3000 (watch)
```

> O `.env` real e o cliente Prisma gerado (`generated/`) são ignorados pelo git.
> Em uma nova máquina, rode `npm install` (gera o client) e `npm run prisma:migrate`.

## Scripts

| Script                    | O que faz                                  |
| ------------------------- | ------------------------------------------ |
| `npm run dev`             | Sobe a API com reload (tsx watch)          |
| `npm start`               | Sobe a API uma vez                         |
| `npm run typecheck`       | Checagem de tipos (tsc --noEmit)           |
| `npm run prisma:migrate`  | `prisma migrate dev`                       |
| `npm run prisma:studio`   | Abre o Prisma Studio                       |
| `npm test`                | Roda a suíte de testes (Vitest)            |
| `npm run test:watch`      | Testes em modo watch                       |
| `npm run test:coverage`   | Testes + relatório de cobertura            |

## Testes

Testes unitários com **Vitest**, em `test/`, espelhando a arquitetura de `src/`.
Cobertura atual: **módulo de autenticação** (`auth-service`, providers, middlewares,
controller, schemas) — ~100% linhas, ~97% branches.

- `AuthService` é testado com **fakes em memória** dos ports (`UserRepository`,
  `RefreshTokenRepository`, `HashProvider`, `TokenProvider`) — rápido e
  determinístico, sem tocar banco/bcrypt/jwt reais.
- `JwtTokenProvider` e `BcryptHashProvider` são testados com as libs **reais**
  (jsonwebtoken/bcrypt), validando comportamento de assinatura, expiração e hash.
- Repositórios Prisma e o módulo de tarefas ainda não têm testes automatizados
  (validados até aqui via os scripts e2e/Bruno) — próximo passo natural seria
  um teste de integração contra SQLite real.

```bash
npm test              # roda tudo uma vez
npm run test:coverage # com relatório de cobertura (text + html em coverage/)
```

## Endpoints

| Método | Rota             | Auth   | Corpo                     | Sucesso                                   |
| ------ | ---------------- | ------ | ------------------------- | ----------------------------------------- |
| POST   | `/auth/register` | —      | `{ email, password }`     | `201 { user }`                            |
| POST   | `/auth/login`    | —      | `{ email, password }`     | `200 { user, accessToken, refreshToken }` |
| POST   | `/auth/refresh`  | —      | `{ refreshToken }`        | `200 { accessToken, refreshToken }`       |
| POST   | `/auth/logout`   | —      | `{ refreshToken }`        | `204`                                     |
| GET    | `/auth/me`       | Bearer | —                         | `200 { user }`                            |
| GET    | `/tasks`         | Bearer | —                         | `200 { tasks }`                           |
| POST   | `/tasks`         | Bearer | `{ title, description? }` | `201 { task }`                            |
| PUT    | `/tasks/:id`     | Bearer | `{ title?, description?, completed? }` | `200 { task }`               |
| DELETE | `/tasks/:id`     | Bearer | —                         | `204`                                     |
| GET    | `/health`        | —      | —                         | `200 { status: "ok" }`                    |

Exemplo:

```bash
# registrar
curl -X POST localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"joao@ex.com","password":"senhaSegura123"}'

# login (guarde accessToken e refreshToken)
curl -X POST localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"joao@ex.com","password":"senhaSegura123"}'

# rota protegida
curl localhost:3000/auth/me -H "Authorization: Bearer <accessToken>"
```

## Como a sessão funciona

- **Access token** (JWT, curto — 15 min): enviado em `Authorization: Bearer`.
  Stateless; o middleware `ensureAuthenticated` valida e injeta `req.userId`.
- **Refresh token** (opaco, 7 dias): persistido no banco como **SHA-256**
  (nunca o valor puro). Permite:
  - **`/auth/refresh`** → valida, **revoga o token usado (rotação)** e emite um
    novo par. Reuso de um refresh antigo é rejeitado.
  - **`/auth/logout`** → revoga o refresh token, encerrando a sessão.

## Notas de segurança

- Senha: **bcrypt** (12 rounds); o texto puro nunca é persistido/retornado.
- Refresh token: guardado só como hash SHA-256; vazamento do banco não expõe sessões.
- Mensagem de login genérica ("E-mail ou senha inválidos") — não revela e-mails cadastrados.
- `JWT_ACCESS_SECRET` fica no `.env` (fora do git). Use um segredo forte e único por ambiente.

## Tarefas

Todas as rotas de `/tasks` exigem `Authorization: Bearer <accessToken>`. Cada
tarefa pertence ao usuário autenticado (`req.userId`); operar numa tarefa de
outro usuário retorna **404** (proteção contra IDOR, feita no `TasksService`).

```bash
# criar tarefa
curl -X POST localhost:3000/tasks \
  -H "Authorization: Bearer <accessToken>" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Comprar pão","description":"na padaria"}'

# concluir tarefa
curl -X PUT localhost:3000/tasks/<id> \
  -H "Authorization: Bearer <accessToken>" \
  -H 'Content-Type: application/json' \
  -d '{"completed":true}'
```
