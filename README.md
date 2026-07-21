# RemedCalc

Calculadora web para apoiar farmácias na dispensação de medicamentos por período.

## Recursos

- Cálculo para comprimidos: dose, intervalo em horas, dias de tratamento e dias de entrega.
- Conversão do total em cartelas e caixas, sempre arredondando para cima.
- Cálculo para líquidos em mL com conversão para frascos.
- Reserva técnica opcional em percentual.
- Limitação automática para não calcular entrega maior que a duração do tratamento.
- Histórico local em `localStorage` com receitas e remédios numerados automaticamente.
- Botão **Adicionar medicamento** para incluir o cálculo atual na receita em aberto.
- Botão **Nova receita** para arquivar a receita atual no histórico e iniciar outra.

## Como rodar

```bash
npm install
npm run start
```

## Build

```bash
npm run build
```


## Deploy gratuito no GitHub Pages

Este projeto já inclui um workflow em `.github/workflows/deploy-pages.yml` para publicar o build estático no GitHub Pages em `https://loopstop.github.io/RemedCalc/`.

1. No GitHub, abra **Settings → Pages**.
2. Em **Build and deployment**, selecione **GitHub Actions** como fonte.
3. Faça push da branch `work` ou rode o workflow manualmente em **Actions → Deploy RemedCalc to GitHub Pages**.
4. A URL final configurada é `https://loopstop.github.io/RemedCalc/`.

Para repositórios públicos, GitHub Pages está disponível no GitHub Free e o GitHub Actions é gratuito para repositórios públicos. Em repositórios privados, pode depender do plano e/ou da cota mensal de Actions.


> Observação: `https://loopstop.github.io/` só funciona como site raiz se o repositório publicado se chamar exatamente `loopstop.github.io`. Como este projeto está no repositório `RemedCalc`, a URL padrão correta do GitHub Pages é `https://loopstop.github.io/RemedCalc/`.


## Se aparecer só o texto "RemedCalc"

Isso indica que o GitHub Pages está servindo a página gerada pelo Jekyll a partir do README, não o build Vite do app.

Correção direta:

1. No GitHub, abra **Settings → Pages**.
2. Em **Build and deployment → Source**, selecione **GitHub Actions**.
3. Rode o workflow **Deploy RemedCalc to GitHub Pages** em **Actions** ou faça push na branch configurada.
4. Aguarde o deploy finalizar e acesse `https://loopstop.github.io/RemedCalc/`.

O arquivo `.nojekyll` foi incluído na raiz e no build público para impedir processamento Jekyll quando o site for publicado como app estático.


## Alternativa se o Pages estiver em "Deploy from a branch"

Se você não quiser usar **GitHub Actions** como fonte do Pages, selecione:

- **Settings → Pages → Build and deployment → Source:** `Deploy from a branch`
- **Branch:** `main` ou `work`, conforme a branch enviada ao GitHub
- **Folder:** `/docs`

A pasta `docs/` contém uma cópia estática pronta do app. Neste modo, a URL continua `https://loopstop.github.io/RemedCalc/` e o GitHub não vai mais publicar apenas o README.


## Como confirmar que a versão nova publicou

Abra `https://loopstop.github.io/RemedCalc/?v=historico-local` em aba anônima. A versão correta mostra:

- Lista **Receitas** à esquerda.
- Botões **Adicionar medicamento** e **Nova receita** no centro.
- Painel **Histórico** à direita.
- Rodapé central com `Versão: histórico local · RemedCalc v2`.

Se a página ainda carregar arquivos antigos como `assets/index-BDuydvXl.js`, o GitHub Pages ainda não publicou o commit novo. Nesse caso, confirme se a branch configurada em **Settings → Pages** é a mesma branch onde o commit foi enviado e aguarde a invalidação de cache do Pages.
