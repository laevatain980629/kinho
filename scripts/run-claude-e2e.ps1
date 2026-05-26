param(
  [string]$BaseDir = (Get-Location).Path,
  [string]$ApiBase = 'http://127.0.0.1/api',
  [string]$PcBase = 'http://127.0.0.1',
  [string]$H5Base = 'http://127.0.0.1/customer-h5',
  [string]$MobileBase = 'http://127.0.0.1/mobile-web',
  [string]$PromptFile = "$PSScriptRoot/../tests/e2e/claude-real-click-e2e.prompt.md"
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  throw '找不到 claude CLI。请先安装 Claude Code CLI。'
}

if (-not (Test-Path $PromptFile)) {
  throw "找不到提示文件: $PromptFile"
}

$prompt = Get-Content $PromptFile -Raw

$env:API_BASE = $ApiBase
$env:PC_BASE = $PcBase
$env:H5_BASE = $H5Base
$env:MOBILE_BASE = $MobileBase
$env:BASE_DIR = $BaseDir

$wrappedPrompt = @"
你现在在 Kinho 仓库里做真实点击的 E2E 测试，不要修改代码，只做测试与审查。

请严格遵守仓库中的 ecc-e2e-testing 技能，优先使用真实页面点击而不是直接调用 API。
如果必须调用 API，只允许作为最后的兜底，不得用 API 跳过核心 UI 链路。

以下是任务说明：
$prompt
"@

claude -p $wrappedPrompt `
  --dangerously-skip-permissions `
  --tools Read,Grep,Glob,Bash `
  --model sonnet `
  --effort high `
  --max-budget-usd 5 `
  --add-dir $BaseDir
