Prepare e execute o commit da mudanca atual, seguindo o fluxo do projeto.

Ordem obrigatoria, sem pular etapa:

1. `git status` e `git diff` — mostre o que mudou e confirme que nao ha segredo,
   `.env`, chave de API ou arquivo temporario no diff.
2. Rode o build. Se quebrar, PARE e conserte antes de seguir.
3. Rode os testes VOCE MESMO. Nao aceite relatorio de subagente como prova.
4. Chame `@agent-code-reviewer` para revisao adversarial do diff.
5. Se o diff tocar a chave do Gemini, input de usuario, ou escrita em `memoria/`,
   chame tambem `@agent-security-auditor`.
6. So entao: `git add` dos arquivos relevantes (nunca `git add -A` as cegas),
   `git commit` com mensagem em portugues, imperativo, uma linha,
   e `git push origin main`.

REGRAS DE GIT DESTE PROJETO:
- Commit sempre direto na `main`. NUNCA crie branch, worktree ou PR.
- NUNCA use `--force`, `rebase`, `reset --hard` em algo ja enviado, nem `--no-verify`.
- Para desfazer algo commitado: `git revert <sha>`.

Se qualquer gate falhar, pare e reporte. Nao commite "para nao perder o trabalho".
