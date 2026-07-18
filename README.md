# 🌱 Fazenda Boa Vista — Sistema de Gestão

Sistema web que substitui a planilha da fazenda: financeiro (caixa, contas a pagar/receber), estoque por movimentações, compras, vendas, máquinas, checklists, ocorrências, manutenções, combustível, funcionários/EPIs, café, abacate, suínos e tarefas — com dashboard, controle de acesso por perfil, interface mobile do operador e auditoria completa.

**Stack:** HTML + CSS + JavaScript + Bootstrap · Node.js + Express · PostgreSQL via Supabase (Auth + Storage). Sem Docker, sem microsserviços.

---

## Estrutura do projeto

```
fazenda-boa-vista/
├── db/
│   ├── 01_schema.sql      # tabelas, views calculadas, triggers, índices
│   ├── 02_rls.sql         # políticas de segurança (RLS) + bucket de anexos
│   └── 03_seed.sql        # dados iniciais + dados fictícios de demonstração
├── server.js              # servidor Express
├── src/
│   ├── supabase.js        # clientes Supabase (service role e anon)
│   ├── middleware/auth.js # autenticação por token + perfis
│   ├── config/tabelas.js  # permissões por tabela e perfil (coração do controle de acesso)
│   └── routes/
│       ├── auth.js        # login e criação de usuários
│       ├── generic.js     # CRUD genérico com auditoria e exclusão lógica
│       ├── negocio.js     # integrações: pagar/receber, compra→estoque, venda→estoque, checklist→ocorrência...
│       ├── dashboard.js   # indicadores agregados
│       └── upload.js      # fotos/comprovantes → Supabase Storage
├── public/
│   ├── index.html         # login
│   ├── admin.html + js/admin.js       # painel administrativo (desktop)
│   ├── operador.html + js/operador.js # interface mobile do operador
│   ├── css/app.css        # identidade visual
│   └── js/api.js          # camada de acesso à API
└── scripts/criar-admin.js # cria o primeiro administrador
```

---

## PARTE 1 — Supabase (banco, autenticação e storage)

1. Acesse **https://supabase.com** → crie uma conta gratuita → **New project**.
   - Nome: `fazenda-boa-vista` · defina uma senha forte do banco · região: `South America (São Paulo)`.
2. Com o projeto criado, abra **SQL Editor** (menu lateral) e execute **nesta ordem**, um de cada vez (cole o conteúdo → **Run**):
   1. `db/01_schema.sql`
   2. `db/02_rls.sql`  *(também cria o bucket de anexos "anexos")*
   3. `db/03_seed.sql` *(dados iniciais + demonstração — opcional em produção, mas recomendado para apresentar)*
3. Copie as credenciais em **Project Settings → API**:
   - `Project URL` → será o `SUPABASE_URL`
   - `anon public` → será o `SUPABASE_ANON_KEY`
   - `service_role` → será o `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **secreta, só no backend**

> Segurança: o RLS bloqueia qualquer acesso direto ao banco pela chave anônima. Todo acesso passa pelo backend, que aplica as permissões por perfil (`src/config/tabelas.js`).

---

## PARTE 2 — Rodando localmente (Windows, macOS ou Linux)

Pré-requisito: **Node.js 18+** (https://nodejs.org).

```bash
# 1. entre na pasta do projeto
cd fazenda-boa-vista

# 2. instale as dependências
npm install

# 3. configure as variáveis de ambiente
cp .env.example .env        # (Windows: copy .env.example .env)
# edite o .env e cole as 3 credenciais do Supabase

# 4. crie o primeiro administrador
npm run criar-admin -- "Seu Nome" admin@fazenda.com SuaSenhaForte123

# 5. inicie o sistema
npm start
```

Abra **http://localhost:3000** e faça login.

Para testar o perfil operador: logado como admin, vá em **Sistema → Usuários → Novo usuário** e crie um usuário com perfil `operador`. Faça login com ele no celular (ou no modo mobile do navegador) para ver a interface operacional.

---

## PARTE 3 — Publicando no GitHub

```bash
cd fazenda-boa-vista
git init
git add .
git commit -m "Sistema de gestão Fazenda Boa Vista"
```

No GitHub: **New repository** → `fazenda-boa-vista` (pode ser privado) → siga os comandos exibidos:

```bash
git remote add origin https://github.com/SEU-USUARIO/fazenda-boa-vista.git
git branch -M main
git push -u origin main
```

> O `.gitignore` já impede o envio do `.env` (credenciais) e do `node_modules`.

---

## PARTE 4 — Colocando no ar (hospedagem)

O backend serve também o frontend, então **um único deploy resolve tudo**. Duas opções gratuitas/simples:

### Opção A — Render (recomendada)
1. https://render.com → login com GitHub → **New → Web Service** → selecione o repositório.
2. Configure:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
3. Em **Environment**, adicione as variáveis:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. **Create Web Service**. Em ~2 min o sistema estará em `https://fazenda-boa-vista.onrender.com`.

*(No plano gratuito o serviço "dorme" após inatividade; a primeira requisição demora ~30 s.)*

### Opção B — Railway
1. https://railway.app → **New Project → Deploy from GitHub repo**.
2. Em **Variables**, adicione as mesmas 3 variáveis de ambiente.
3. Em **Settings → Networking → Generate Domain** para obter a URL pública.

### Acesso pelo celular
A interface do operador é uma página responsiva — basta abrir a URL no navegador do celular. Para virar "aplicativo": abra a URL no Chrome/Safari → menu → **Adicionar à tela inicial**.

---

## Usuários e permissões (resumo)

| Recurso | Administrador | Administrativo | Operador |
|---|---|---|---|
| Dashboard, relatórios | ✔ | ✔ | ✖ |
| Caixa, contas a pagar/receber, compras, vendas | ✔ | ✔ | ✖ |
| Produtos e estoque | ✔ | ✔ | consulta sem valores + registra movimentação |
| Máquinas, manutenções | ✔ | consulta | consulta |
| Checklists, abastecimentos, ocorrências, produção | ✔ | consulta | registra e vê **os próprios** |
| Salários | ✔ | ✖ | ✖ |
| Usuários, modelos de checklist, auditoria | ✔ | ✖ | ✖ |

Regras de integridade já implementadas no backend/banco:
- Pagar/receber uma conta lança automaticamente no caixa, com **vínculo 1:1** (constraint UNIQUE impede duplicação);
- Saldo de estoque é **calculado pelas movimentações** (view `vw_saldo_estoque`), nunca editado direto;
- Confirmar compra gera entrada no estoque + conta a pagar opcional; confirmar venda valida o saldo (RN09), gera saída + conta a receber;
- Não conformidade em checklist gera ocorrência automaticamente;
- Horímetro/km menor que o último gera alerta e pede confirmação;
- Registros financeiros, estoque, combustível e checklists **nunca são apagados** — só cancelados, com motivo e log em `logs_alteracao`;
- Suínos: quantidade atual, mortalidade, ração e custo calculados pela view `vw_resumo_lotes`;
- Produtividade do café calculada em sacas/ha; abacate valida venda + perdas ≤ colhido.

## Logins de demonstração
Após rodar o seed e criar usuários, sugestão para apresentar:
- `admin@fazenda.com` (administrador) — dashboard completo;
- `financeiro@fazenda.com` (administrativo) — sem salários, sem configurações;
- `joao@fazenda.com` (operador) — abrir no celular.
