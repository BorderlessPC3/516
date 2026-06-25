# Heróis dos Prêmios

Monorepo profissional para a plataforma **Heróis dos Prêmios** — aplicativo mobile de campanhas promocionais com vídeos, moedas, cupons e sorteios.

## Estrutura do Repositório

```
herois-dos-premios/
├── herois-dos-premios-app/   # React Native Expo (Mobile)
├── painel-web/               # Next.js 15 (Painel Admin)
├── shared/                   # Types, validators, constants, helpers
├── firebase/                 # Rules, indexes, Cloud Functions
├── docs/                     # Documentação técnica
├── scripts/                  # Scripts utilitários (seed, deploy)
└── README.md
```

## Stack

| Camada  | Tecnologias                                                   |
| ------- | ------------------------------------------------------------- |
| Mobile  | Expo SDK 56, Expo Router, NativeWind, TanStack Query, Zustand |
| Web     | Next.js 15, Tailwind, Shadcn UI, Recharts                     |
| Backend | Firebase Auth, Firestore, Storage, Cloud Functions, FCM       |
| Vídeos  | AWS S3 + CloudFront (via Cloud Functions)                     |
| Shared  | TypeScript, Zod                                               |

## Pré-requisitos

- Node.js >= 20
- npm >= 10
- Conta Firebase (projeto configurado)
- Conta AWS (S3 bucket + CloudFront distribution) — para pipeline de vídeos
- FFmpeg instalado no ambiente das Cloud Functions (para compressão)

## Configuração

### 1. Variáveis de ambiente

Copie `.env.example` para `.env` na raiz e configure:

```bash
cp .env.example .env
```

Configure também:

- `herois-dos-premios-app/.env` — variáveis `EXPO_PUBLIC_FIREBASE_*`
- `painel-web/.env.local` — variáveis `NEXT_PUBLIC_FIREBASE_*`

### 2. Instalar dependências

```bash
npm install
npm run build:shared
```

### 3. Firebase

```bash
# Login e selecionar projeto
npx firebase login
npx firebase use --add

# Deploy rules e indexes
npm run firebase:deploy:rules

# Deploy functions (requer AWS configurada)
cd firebase/functions && npm run deploy
```

### 4. Seed inicial

```bash
# Configure GOOGLE_APPLICATION_CREDENTIALS ou firebase login
npm run seed
```

Substitua `REPLACE_WITH_AUTH_UID` no documento `admins` pelo UID do usuário criado no Firebase Auth.

### 5. Executar apps

```bash
# Mobile
npm run dev:app

# Painel Web
npm run dev:web
```

## Arquitetura

### Clean Architecture (Mobile)

```
src/
├── domain/           # Use cases (regras de negócio)
├── data/             # Repositories, mappers
├── infrastructure/   # Firebase, Scanner, Video, API
├── presentation/     # Components, hooks, store
└── core/             # Config, providers, theme
```

### RBAC (Painel Web)

| Role        | Permissões                              |
| ----------- | --------------------------------------- |
| SUPER_ADMIN | Todas                                   |
| ADMIN       | CRUD completo (exceto gestão de admins) |
| OPERADOR    | Leitura + envio de notificações         |

### Pipeline de Vídeos

```
Painel upload → Firebase Storage (temp)
     ↓
Cloud Function (onVideoUploadComplete)
     ↓
Compressão (FFmpeg) → Legendas (STT) → Upload S3
     ↓
CloudFront CDN → App Mobile
```

### Scanner (Extensível)

`ScannerService` implementa `IScannerService` com suporte a:

- QR Code ✅
- Deep Links ✅
- Universal Links ✅
- Reconhecimento Visual (Vuforia) — preparado, não implementado

## Collections Firestore

`users`, `campaigns`, `campaignVideos`, `campaignImages`, `coupons`, `draws`, `prizes`, `coins`, `coinTransactions`, `notifications`, `videoProgress`, `videoViews`, `socialActions`, `cities`, `settings`, `admins`, `auditLogs`

## O que você precisa fornecer

| Item                 | Descrição                                                     |
| -------------------- | ------------------------------------------------------------- |
| **Firebase Project** | `google-services.json`, credenciais web, habilitar Phone Auth |
| **AWS S3**           | Bucket + IAM credentials com permissão PutObject              |
| **CloudFront**       | Distribution apontando para o bucket S3                       |
| **Domínio**          | Para Universal Links (`heroisdospremios.com.br`)              |
| **Apple/Google**     | Certificados para push notifications em produção              |
| **Vuforia**          | License key quando integrar reconhecimento visual             |

## Scripts

| Comando                   | Descrição                |
| ------------------------- | ------------------------ |
| `npm run dev:app`         | Inicia Expo              |
| `npm run dev:web`         | Inicia Next.js           |
| `npm run build`           | Build all workspaces     |
| `npm run lint`            | ESLint                   |
| `npm run format`          | Prettier                 |
| `npm run seed`            | Seed Firestore           |
| `npm run firebase:deploy` | Deploy completo Firebase |

## Licença

Proprietário — Heróis dos Prêmios © 2026
