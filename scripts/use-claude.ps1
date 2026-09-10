# Volta o Claude Code para a Anthropic padrao (sua assinatura Pro), desfazendo o roteamento pra GLM/Kimi/etc.
# Uso: . .\scripts\use-claude.ps1

Remove-Item Env:\ANTHROPIC_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_DEFAULT_SONNET_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_DEFAULT_OPUS_MODEL -ErrorAction SilentlyContinue
Remove-Item Env:\ANTHROPIC_DEFAULT_HAIKU_MODEL -ErrorAction SilentlyContinue

Write-Output "Claude Code de volta ao padrao (Anthropic / sua assinatura Pro) nesta sessao de terminal."
