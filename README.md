# Apuração 2026

Painel do segundo turno de 2026 com dados oficiais do Tribunal Superior Eleitoral. Mostra o resultado presidencial do Brasil e das 27 UFs, além das seis disputas para governador (AC, AM, DF, ES, RN e TO).

## Rodar localmente

```bash
npm ci
npm run dev
```

A interface consulta `/api/results` a cada 30 segundos. Essa rota lê os arquivos públicos do TSE no servidor e mantém cache de 25 segundos. Se algum arquivo falhar, os demais resultados continuam disponíveis.

O mapa usa a malha simplificada das 27 UFs do IBGE, incluída em `data/br-ufs.json`. Os contornos foram reorientados para o renderizador geográfico; `npm test` verifica essa geometria. Cada UF é colorida pelo partido do candidato à presidência que está à frente naquele estado: PT em vermelho, PL em azul. A cor representa apenas a liderança parcial daquela UF. Os percentuais aparecem com duas casas decimais, e o detalhe do mapa mostra a diferença entre os candidatos em pontos percentuais.

## Netlify

Importe este repositório na Netlify e selecione o ramo `deploy`. O arquivo `netlify.toml` define Node.js 22, `npm run build` e a publicação de `.next`. A Netlify cria uma função para a rota `/api/results` automaticamente; não são necessárias variáveis de ambiente.

Fonte: https://www.tse.jus.br/eleicoes/informacoes-tecnicas-sobre-a-divulgacao-de-resultados

Malha: https://servicodados.ibge.gov.br/api/docs/malhas?versao=3
