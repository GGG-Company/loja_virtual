 Pronto. Resumindo tudo:

  Estoque Hiper:
  - Não é em tempo real — o Hiper não tem webhook push                                                                    - Quando você clica "Sincronizar", ele busca o estoque atual (já com as vendas do PDV descontadas) e atualiza a loja
  - Se quiser automático, posso criar um endpoint que seja chamado periodicamente (ex: cron externo ou função agendada) 
  Marcas — o que mudou:
  Agora nas páginas de Novo Produto e Editar Produto aparece um link + Nova marca ao lado do label "Marca". Ao clicar,
  substitui o select por um campo de texto + botão "Criar":
  - Digita o nome → Enter ou clica "Criar"
  - A marca é criada na hora, já aparece selecionada no produto
  - Clicar "Cancelar" volta ao select normal

  Produtos do Hiper continuam recebendo marca automaticamente no sync.

✻ Worked for 1m 19s

> Pode ajeitar esse da hiper, as que não afete as vendas    