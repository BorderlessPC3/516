# Arquitetura — Heróis dos Prêmios

## Visão Geral

```mermaid
flowchart TB
    subgraph Mobile["App Mobile (Expo)"]
        A[Expo Router]
        B[Clean Architecture]
        C[ScannerService]
        D[Video Player]
    end

    subgraph Web["Painel Web (Next.js)"]
        E[App Router]
        F[RBAC]
        G[Dashboard KPIs]
    end

    subgraph Firebase["Firebase"]
        H[Auth]
        I[Firestore]
        J[Storage]
        K[Cloud Functions]
        L[FCM]
    end

    subgraph AWS["AWS"]
        M[S3]
        N[CloudFront]
    end

    Mobile --> H
    Mobile --> I
    Web --> H
    Web --> I
    Web --> J
    J --> K
    K --> M
    M --> N
    N --> Mobile
    K --> L
    L --> Mobile
```

## Escalabilidade (Milhões de Registros)

- **Firestore indexes compostos** configurados para queries frequentes
- **Paginação cursor-based** via `startAfter` (shared constants: DEFAULT_PAGE_SIZE)
- **Denormalização** de `coinBalance` no documento `users`
- **Cloud Functions** para writes críticos (moedas, transações)
- **CDN CloudFront** para entrega de vídeos (sem carga no Firebase Storage)
- **Rate limiting** configurável via env vars

## Integrações Futuras

### Vuforia (Reconhecimento Visual)

- Interface: `IScannerService.scanVisualRecognition()`
- Implementação: `ScannerService` em `infrastructure/scanner/`

### IA (Legendas)

- Placeholder em `video-processing.service.ts`
- Integrar: Google Speech-to-Text ou OpenAI Whisper API
