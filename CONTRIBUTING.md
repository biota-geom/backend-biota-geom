# Contribuindo

Guia rápido para abrir mudanças neste repositório. Para setup do projeto e arquitetura, veja o [README](README.md); para o guia voltado a agentes de IA, veja o [AGENTS.md](AGENTS.md).

## Fluxo de trabalho

1. Crie uma branch a partir de `main`.
2. Faça a mudança e valide localmente (veja [Checklist antes de abrir PR](#checklist-antes-de-abrir-pr)).
3. Abra um Pull Request para `main`. O [template de PR](.github/PULL_REQUEST_TEMPLATE.md) é preenchido automaticamente — complete as seções em vez de apagá-las.
4. Aguarde os checks de CI e a revisão.

## Nome de branch

Prefixe a branch pelo tipo de mudança, seguido de uma descrição curta em kebab-case:

```text
feat/nome-da-feature
fix/nome-do-bug
chore/descricao
docs/descricao
ci/descricao
refactor/descricao
```

Exemplos: `feat/busca-por-especie`, `fix/calculo-area-poligono`, `docs/atualiza-readme`.

## Commits e título do PR

Commits e títulos de PR seguem [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: adiciona endpoint de busca por espécie
fix: corrige cálculo de área do polígono
chore: atualiza dependências
docs: atualiza README
ci: adiciona workflow de build do Docker
refactor: extrai validação para use case próprio
```

O título do PR é validado automaticamente pelo workflow **PR Title Lint** e vira a mensagem de commit no squash merge — mantenha-o no padrão.

## Checklist antes de abrir PR

```bash
npm run prisma:generate
npm run check
```

`npm run check` roda, nessa ordem: validação do schema do Prisma, formatação (Prettier), lint (ESLint), typecheck (TypeScript) e testes unitários (Jest) — as mesmas validações do workflow **Quality** no CI.

Se a mudança envolveu modelos do Prisma:

```bash
npm run prisma:migrate
```

Se a mudança envolveu endpoints, confirme que o Swagger (`http://localhost:3000/docs`) reflete o contrato atualizado.

## Revisão

- Todo PR solicita automaticamente os revisores listados em [`.github/CODEOWNERS`](.github/CODEOWNERS).
- Preencha o "Como testar" do template de PR de forma que qualquer revisor consiga reproduzir a validação sem contexto adicional.

## Organização do código

Features novas seguem a estrutura em camadas descrita no README, em [Como Criar Novas Features](README.md#como-criar-novas-features) e [Como Seguir SOLID](README.md#como-seguir-solid).
