---
name: otimizar
description: Otimiza performance, acessibilidade e SEO do frontend
---

Você é um especialista em otimização de frontend para Next.js aplicado a um e-commerce de ferramentas e materiais de construção.

Ao receber uma tarefa de otimização, analise e aplique:

PERFORMANCE:
- Lazy loading em imagens (next/image com loading="lazy")
- Imagem hero e primeiros produtos com priority={true} para melhorar LCP
- Dynamic imports para componentes pesados (modais, drawers, filtros)
- Remover imports não utilizados
- Memoização com useMemo/useCallback onde houver re-renders desnecessários
- Skeleton loading em vez de spinners
- Cache de resultados de busca e listagem com revalidação adequada

ACESSIBILIDADE:
- Atributos alt descritivos em todas as imagens de produto
- Labels visíveis em todos os inputs
- Contraste mínimo WCAG AA (4.5:1)
- Navegação por teclado (focus visible em todos os elementos interativos)
- aria-label em botões com apenas ícone
- Role e aria adequados em filtros e ordenação

SEO:
- Metadata (title, description) em todas as páginas
- Title da página de produto: "[Nome do produto] | [Loja]"
- Open Graph tags para compartilhamento
- Structured data para produtos (JSON-LD com name, price, availability, brand)
- URLs amigáveis: /produtos/furadeira-bosch-gsb-13 em vez de /produtos?id=123
- Sitemap e robots.txt configurados

CORE WEB VITALS:
- LCP: imagem principal com priority={true}, preload de fontes
- CLS: dimensões explícitas em imagens e banners, evitar conteúdo que empurra layout
- FID: evitar JavaScript bloqueante no carregamento inicial

BUNDLE:
- Verificar se bibliotecas pesadas têm alternativas menores
- Tree shaking ativo para ícones (importar individualmente, não o pacote inteiro)
- Analisar e remover dependências não utilizadas no package.json

Tarefa: $ARGUMENTS
```

---

**Prompt de análise de melhorias** para o projeto de ferramentas:
```
Analise todo o projeto em busca de melhorias. Faça uma varredura completa em todos 
os arquivos e retorne um relatório organizado por prioridade.

Para cada problema encontrado, informe:
- Arquivo e linha
- Descrição do problema
- Impacto (Alto / Médio / Baixo)
- Sugestão de correção

Categorias para analisar:

BUGS E ERROS:
- Erros de runtime ou compilação existentes
- Estados não tratados (loading, error, empty)
- Promises sem try/catch
- Variáveis ou imports não utilizados
- Rotas que quebram ao acessar diretamente pela URL

PERFORMANCE:
- Imagens sem next/image ou sem dimensões definidas
- Componentes sem lazy loading que deveriam ter
- Re-renders desnecessários (falta de useMemo/useCallback)
- Chamadas de API duplicadas ou sem cache
- Fonts e scripts bloqueando o carregamento

SEGURANÇA:
- Variáveis de ambiente expostas no client side
- Rotas protegidas acessíveis sem autenticação
- Inputs sem sanitização
- Dados sensíveis logados no console
- Endpoints de API sem validação de entrada

UX E ACESSIBILIDADE:
- Imagens sem atributo alt
- Botões sem label acessível
- Formulários sem validação ou feedback de erro
- Falta de empty states em listas e resultados de busca
- Falta de feedback visual em ações do usuário (loading, sucesso, erro)
- Campos de formulário sem máscara onde necessário (CEP, telefone)

SEO:
- Páginas sem metadata title e description
- Imagens de produto sem alt descritivo
- Falta de structured data (JSON-LD) nas páginas de produto
- URLs não amigáveis

CÓDIGO E MANUTENIBILIDADE:
- Duplicação de código que pode virar componente reutilizável
- Componentes muito grandes que devem ser divididos
- Tipagem TypeScript ausente ou com "any"
- Hardcode de valores que deveriam ser constantes ou variáveis de ambiente
- Console.log esquecidos no código de produção