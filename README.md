# todo_api — Autenticação (JWT + Prisma)

API de registro/login para um app de tarefas, em **Clean Architecture** com
Express 5, Prisma 7 (PostgreSQL via Neon) e JWT (access + refresh token com rotação).

## Stack

- **Node 22+** + **TypeScript** (ESM), executado com **tsx** (sem build)
- **Express 5** — HTTP
- **Prisma 7** + **PostgreSQL** (driver adapter `@prisma/adapter-pg`) hospedado no [Neon](https://neon.tech)
- **jsonwebtoken** — access token (JWT) | **bcrypt** — hash de senha
- **zod** — validação de entrada e das variáveis de ambiente
- **express-rate-limit** — rate limiting (geral + estrito em rotas de auth)

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
│  ├─ prisma.ts            PrismaClient + adapter Postgres (@prisma/adapter-pg)
│  ├─ repositories/        prisma-{user,refresh-token,tasks}-repository.ts
│  └─ providers/           bcrypt-hash-provider.ts · jwt-token-provider.ts
├─ http/                   Camada web (Express)
│  ├─ app.ts               createApp(routers) — não conhece services
│  ├─ controllers/         auth-controller.ts · tasks-controller.ts
│  ├─ middlewares/         ensure-authenticated · validate-body · error-handler · rate-limit
│  ├─ routes/              auth.routes.ts · tasks.routes.ts
│  └─ schemas/             auth-schemas.ts · task-schemas.ts (Zod)
├─ errors.ts               AppError genérico (statusCode + message)
├─ config.ts               Env validado (fail-fast)
├─ container.ts            Composition Root (monta o grafo de dependências)
└─ index.ts                Bootstrap (app.listen + shutdown gracioso)
```

**Regra de dependência:** `http/` e `infra/` dependem de `domain/`; o domínio
não depende de ninguém. Trocar de banco, ou bcrypt por argon2, altera apenas
a classe em `infra/` + a linha no `container.ts` — domínio/aplicação não mudam.

**Desacoplamento do app:** cada feature expõe um _router_ (`http/routes/*`). O
`container.ts` instancia as dependências e monta os routers; o `createApp(routers)`
só recebe routers prontos. Adicionar uma feature = criar seus arquivos e registrar
o router no `container.ts` — a assinatura do `createApp` nunca muda.

## Setup

```bash
npm install                 # deps (postinstall roda prisma generate)
cp .env.example .env        # ajuste DATABASE_URL e JWT_ACCESS_SECRET
npm run prisma:migrate      # aplica as migrations no banco
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
Cobertura atual: **autenticação** e **tarefas** (services, providers, middlewares,
controllers, schemas) — 86 testes, ~100% linhas, ~97% branches.

- `AuthService` e `TasksService` são testados com **fakes em memória** dos ports
  (`UserRepository`, `RefreshTokenRepository`, `TasksRepository`, `HashProvider`,
  `TokenProvider`) — rápido e determinístico, sem tocar banco/bcrypt/jwt reais.
- `JwtTokenProvider` e `BcryptHashProvider` são testados com as libs **reais**
  (jsonwebtoken/bcrypt), validando comportamento de assinatura, expiração e hash.
- `TasksService` tem cobertura dedicada da checagem de dono da tarefa(`ensureOwner`):
  update/delete de tarefa de outro usuário retornam 404 — é o teste que trava
  a proteção contra IDOR como regressão.

```bash
npm test              # roda tudo uma vez
npm run test:coverage # com relatório de cobertura (text + html em coverage/)
```

## Endpoints

| Método | Rota             | Auth   | Corpo                     | Sucesso                                   |
| ------ | ---------------- | ------ | ------------------------- | ----------------------------------------- |
| POST   | `/auth/register` | —      | `{ name, email, password }` | `201 { user }`                          |
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
  -d '{"name":"Joao Sertoli","email":"joao@ex.com","password":"senhaSegura123"}'

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
- `JWT_ACCESS_SECRET` fica no `.env`.
- **Rate limiting** (`express-rate-limit`, [rate-limit.ts](src/http/middlewares/rate-limit.ts)):
  - Limite **geral**: 100 req/min por IP, aplicado a toda a API em `app.ts`
    (antes até do parse do body, pra rejeitar flood sem gastar CPU).
  - Limite **de auth**: 10 tentativas/15 min por IP, com **contador
    independente por rota** em `/auth/register`, `/auth/login` e
    `/auth/refresh` — mitiga brute force/credential stuffing sem deixar uma
    rota bloqueada travar as outras.
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

## Pontos de melhoria com mais tempo

- Implementar um login federado, google, GitHub, etc
- Adicionar a api em um contêiner para deixá-la portável
- Melhorar a segurança da api para evitar ataques (CDN e firewall)
- Adicionar cache na api para informações mais acessadas
- Read replicas para não sobrecarregar o banco, possibilitando adicionar load balancers
