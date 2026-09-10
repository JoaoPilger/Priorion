Crie um ponto de retorno seguro antes de uma mudanca grande.

1. Confirme que o working tree esta limpo (`git status`). Se nao estiver,
   pergunte se deve commitar antes.
2. Confirme que o build passa e os testes passam AGORA. Ponto de retorno com
   build quebrado nao serve para nada.
3. `git tag ok-$(date +%Y%m%d-%H%M)` no commit atual.
4. `git push origin --tags`
5. Me informe o nome da tag e o comando exato para voltar a ela:
   `git revert` do intervalo, ou `git checkout <tag> -- <arquivos>` para
   recuperar arquivos especificos.

NUNCA sugira `git reset --hard` como forma de voltar. Neste projeto nao
reescrevemos historico.
