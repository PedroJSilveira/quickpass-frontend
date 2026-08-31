# QuickPass — Web (Angular)

Reimplementação em Angular (standalone components + signals) do protótipo de
design **QuickPass MVP**, um marketplace de aluguel de carros entre pessoas
físicas (P2P). Baseado no handoff em `design_handoff_quickpass_web/README.md`
fornecido pelo time de design.

## Como rodar

```bash
npm install
npm start
```

Acesse http://localhost:4200.

Para build de produção:

```bash
npm run build
```

## Arquitetura

```
src/app/
  core/
    models/domain.models.ts     interfaces de domínio (Conta, Veiculo, Reserva...)
    services/
      pricing.service.ts        fonte única da verdade dos cálculos financeiros
      auth.service.ts           conta, papel ativo, progresso de KYC
      catalog.service.ts        catálogo de veículos, busca e filtros
      booking.service.ts        reservas e máquina de estados
      owner.service.ts          disponibilidade e solicitações do proprietário
      payout.service.ts         repasses e ganhos
    guards/kyc.guard.ts          bloqueia rotas que exigem conta verificada
  shared/
    components/                 tag, blueprint-frame, seg-control, star-rating
    layout/app-shell.component.ts   topbar + sidenav das telas autenticadas
  features/
    site/        landing pública
    auth/        entrar, cadastro, verificação (KYC)
    renter/      busca, detalhe, reserva, pagamento, confirmação,
                 locações, check-in, check-out, avaliação, perfil
    owner/       painel, veículos, cadastrar veículo, disponibilidade,
                 solicitações, ganhos
```

Todas as rotas de `features/` são carregadas com `loadComponent` (lazy).

## Design system

Os tokens e classes do design system **Industry** (`industry.css` do pacote
original) foram portados para `src/styles.css`, incluindo o padrão
"blueprint" (moldura hairline + marcas de registro nos cantos), usado pelo
componente `<qp-blueprint>`.

## O que é simulação de UI (fora do escopo do protótipo original)

Conforme o handoff original, os seguintes pontos são apenas simulados na UI e
precisam de integração real em produção:

- Autenticação (login/sessão/JWT)
- Upload de fotos e documentos (fotos de veículo, CRLV, seguro, vistoria)
- Gateway de pagamento (Pix / cartão) e pré-autorização de caução
- Verificação de CNH junto ao órgão de trânsito
- Notificações, geolocalização/mapa e chat entre as partes
- Validações de formulário (CPF, placa Mercosul, datas, etc.)
- Estados de carregamento, erro de rede, conflito de reserva e expiração de
  solicitação em 12h

## Ícones

O handoff recomenda `lucide-angular` (já incluso em `package.json`); os
componentes atuais usam texto/SVG simples onde ícones apareciam no protótipo
— trocar por `<lucide-icon>` é direto onde fizer sentido visualmente.
