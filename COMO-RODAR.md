# Como Rodar

## Setup (primeira vez)

```
c:\borderless\projetos\516
npm install --legacy-peer-deps
npm run build:shared
```

## Painel Web

```
c:\borderless\projetos\516
npm run dev:web
```

```
c:\borderless\projetos\516\painel-web
npm run dev
```

http://localhost:3000

## App Mobile

Instale o **Expo Go** na Play Store / App Store (SDK 54). Celular e PC devem estar na mesma rede Wi‑Fi.

**Não rode `npx expo start` na raiz do monorepo** (`516\`) — use um dos comandos abaixo.

```
c:\borderless\projetos\516
npm run dev:app
```

```
c:\borderless\projetos\516\herois-dos-premios-app
npm start
```

Escaneie o QR code com o Expo Go (Android) ou câmera (iOS).

```
c:\borderless\projetos\516\herois-dos-premios-app
npm run android
```

```
c:\borderless\projetos\516\herois-dos-premios-app
npm run web
```

## Firebase Functions (local)

```
c:\borderless\projetos\516\firebase\functions
npm run serve
```

## Seed do banco

```
c:\borderless\projetos\516
npm run seed
```
