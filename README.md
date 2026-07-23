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
├─ core/               Regras — NÃO conhece Express nem Prisma
│  ├─ types.ts         User, RefreshToken, PublicUser
│  ├─ errors.ts        AppError + erros de negócio (com statusCode)
│  ├─ ports.ts         Interfaces: UserRepository, RefreshTokenRepository,
│  │                   HashProvider, TokenProvider
│  └─ auth-service.ts  AuthService: register / login / refresh / logout
├─ infra/              ADAPTERS — implementam os ports
│  ├─ prisma.ts        PrismaClient + adapter SQLite
│  ├─ repositories.ts  Prisma{User,RefreshToken}Repository
│  └─ providers.ts     BcryptHashProvider, JwtTokenProvider
├─ http/               Camada web (Express)
│  ├─ app.ts           createApp + rotas
│  ├─ auth-controller.ts
│  ├─ middlewares.ts   ensureAuthenticated, validateBody, errorHandler
│  └─ schemas.ts       validação Zod
├─ config.ts           Env validado (fail-fast)
└─ index.ts            Composition Root (injeção de dependências manual)
```

**Regra de dependência:** `http/` e `infra/` dependem de `core/`; `core/` não
depende de ninguém. Trocar SQLite por Postgres, ou bcrypt por argon2, altera
apenas a classe em `infra/` + a linha no `index.ts` — o `core/` não muda.

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

## Endpoints

| Método | Rota             | Auth   | Corpo                     | Sucesso                                   |
| ------ | ---------------- | ------ | ------------------------- | ----------------------------------------- |
| POST   | `/auth/register` | —      | `{ email, password }`     | `201 { user }`                            |
| POST   | `/auth/login`    | —      | `{ email, password }`     | `200 { user, accessToken, refreshToken }` |
| POST   | `/auth/refresh`  | —      | `{ refreshToken }`        | `200 { accessToken, refreshToken }`       |
| POST   | `/auth/logout`   | —      | `{ refreshToken }`        | `204`                                     |
| GET    | `/auth/me`       | Bearer | —                         | `200 { user }`                            |
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

## Próximos passos (tarefas)

Ao criar as rotas de tarefas, proteja-as com o middleware existente e use
`req.userId` como dono da tarefa:

```ts
router.use(ensureAuthenticated(tokenProvider));
router.post("/tasks", createTaskController); // dono = req.userId
```
