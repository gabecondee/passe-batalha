# Missões: confirmação de gravação e status

## Problemas encontrados

- Iniciar, concluir e atualizar progresso alteravam apenas o estado local, sem persistir essas ações no Supabase.
- O encerramento automático também alterava apenas o estado local. A interface considerava toda missão vencida como fracassada, mesmo quando a regra de aproveitamento mínimo de 70% indicava conclusão.
- Dois contadores passavam `isMissionActive` diretamente para `filter`; o índice do array era recebido como o parâmetro de data, afetando a contagem de vagas.
- A ação diária gravava um histórico obtido anteriormente e não conferia a linha devolvida pelo banco. Uma sessão concorrente podia sobrescrever registros.

## Fluxo atual

`GameContext` delega as operações a `useMissionPersistence`, que apresenta `MissionSaveDialog` enquanto `missionPersistence` consulta e grava os dados.

1. O app consulta a missão atual do usuário antes de alterar seu estado.
2. A gravação usa os valores lidos como condição para evitar sobrescrever mudanças concorrentes. Havendo conflito, consulta novamente e tenta até três vezes.
3. Só atualiza a missão na tela e confirma sucesso depois de receber a linha salva. Nenhuma linha afetada não é tratada como sucesso.
4. Durante a gravação, cliques repetidos ficam bloqueados. Após 20 segundos sem confirmação, a solicitação é abortada e aparece a opção de tentar novamente.
5. A tentativa novamente consulta se a ação daquele dia já existe. A criação reutiliza o mesmo UUID durante a tentativa pendente, evitando criar outra missão após uma resposta perdida.
6. A lista é atualizada ao retornar ao app, recuperar a conexão e a cada minuto. Respostas antigas e de uma conta anterior são descartadas.

Abortar uma solicitação não prova que o servidor deixou de gravá-la. Por isso a mensagem informa falta de confirmação e a nova tentativa consulta o registro antes de escrever novamente.

## Regra de conclusão

Concluir a ação diária registra aquela data e recalcula o progresso da campanha. A missão permanece aberta até seu prazo, salvo conclusão manual pelas rotas que já a permitem. Ao encerrar o prazo, aproveitamento de pelo menos 70% das datas previstas resulta em `completed`; abaixo disso, em `failed`.

Datas duplicadas, fora do período ou fora da frequência não contam duas vezes nem elevam o aproveitamento. Valores legados no formato `YYYY-MM-DD` são interpretados como datas locais, sem deslocamento por conversão automática de UTC.

Missões concluídas, fracassadas ou vencidas não ocupam vagas ativas. Estados terminais já gravados não são reclassificados automaticamente: uma correção histórica depende de conferir o registro afetado.

## Compatibilidade e limites

Esta alteração usa a tabela `missions` e as permissões existentes. Não exige nova migration, não muda o relógio para o servidor e não altera o fuso adotado pelo app. Prazo e dia da ação continuam dependendo do relógio local, conforme a decisão anterior sobre horários.

O XP mantém o fluxo existente de atualização separada em `profiles`; não faz parte de uma transação com a missão. Uma resposta perdida depois da gravação da missão ou uma falha na atualização do perfil ainda pode exigir conferir o XP. A confirmação apresentada garante a leitura da missão salva, não a confirmação transacional do XP. Uma ação diária já registrada não concede XP novamente na tentativa de confirmação.

As condições de concorrência protegem as gravações deste fluxo. Não há trigger nova impedindo um cliente antigo ou outro escritor de sobrescrever a linha.

Os testes cobrem confirmação pendente, falha de rede, timeout, nova tentativa, resposta perdida, concorrência, troca de conta, liberação de vaga e aproveitamento no encerramento. Não executam alterações no banco de produção.
