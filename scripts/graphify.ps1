[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CommandArgs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$GraphifyOutDir = Join-Path $RepoRoot "graphify-out"
$PinnedPythonFile = Join-Path $GraphifyOutDir ".graphify_python"
$KnownGoodPython = "C:\Program Files\PostgreSQL\18\pgAdmin 4\python\python.exe"
$WorkDir = Join-Path $GraphifyOutDir "work"
$ArchiveDir = Join-Path $GraphifyOutDir "archive"
$GlobalSkillVersionFile = "C:\Users\feriz\.agents\skills\graphify\.graphify_version"

function Show-Usage {
    Write-Host "Usage:"
    Write-Host "  .\scripts\graphify.ps1 doctor"
    Write-Host "  .\scripts\graphify.ps1 update . [--force]"
    Write-Host "  .\scripts\graphify.ps1 query ""<question>"""
    Write-Host "  .\scripts\graphify.ps1 path ""<A>"" ""<B>"""
    Write-Host "  .\scripts\graphify.ps1 explain ""<node>"""
    Write-Host "  .\scripts\graphify.ps1 hook-check"
}

function Test-WindowsAppsShim {
    param([string]$Path)

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $false
    }

    $Resolved = $Path
    try {
        $Resolved = (Resolve-Path -LiteralPath $Path).Path
    }
    catch {
        $Resolved = $Path
    }

    return $Resolved -match "\\AppData\\Local\\Microsoft\\WindowsApps\\python(?:3)?(?:\.exe)?$"
}

function Get-CommandSource {
    param([string]$Name)

    $Command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $Command) {
        return $null
    }

    return $Command.Source
}

function Invoke-NativeCommand {
    param(
        [string]$FilePath,
        [string[]]$Arguments = @(),
        [switch]$SuppressOutput
    )

    $PreviousErrorActionPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        if ($SuppressOutput) {
            & $FilePath @Arguments 2>$null | Out-Null
        }
        else {
            & $FilePath @Arguments | Out-Host
        }

        return $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $PreviousErrorActionPreference
    }
}

function Test-GraphifyPython {
    param(
        [string]$PythonPath,
        [switch]$FullCheck
    )

    if ([string]::IsNullOrWhiteSpace($PythonPath)) {
        return $false
    }

    $Candidate = $PythonPath.Trim()
    if (-not (Test-Path -LiteralPath $Candidate -PathType Leaf)) {
        return $false
    }

    if (Test-WindowsAppsShim -Path $Candidate) {
        return $false
    }

    if ((Invoke-NativeCommand -FilePath $Candidate -Arguments @("-c", "import graphify") -SuppressOutput) -ne 0) {
        return $false
    }

    if ($FullCheck) {
        if ((Invoke-NativeCommand -FilePath $Candidate -Arguments @("-m", "graphify", "--help") -SuppressOutput) -ne 0) {
            return $false
        }
    }

    return $true
}

function Ensure-GraphifyOutDir {
    if (-not (Test-Path -LiteralPath $GraphifyOutDir -PathType Container)) {
        New-Item -ItemType Directory -Path $GraphifyOutDir | Out-Null
    }
}

function Ensure-WorkDir {
    Ensure-GraphifyOutDir
    if (-not (Test-Path -LiteralPath $WorkDir -PathType Container)) {
        New-Item -ItemType Directory -Path $WorkDir | Out-Null
    }
}

function Save-PinnedPython {
    param([string]$PythonPath)

    Ensure-GraphifyOutDir
    $Resolved = (Resolve-Path -LiteralPath $PythonPath).Path
    Set-Content -LiteralPath $PinnedPythonFile -Value $Resolved -NoNewline
}

function Get-PyLauncherPython {
    $PyCommand = Get-Command py -ErrorAction SilentlyContinue
    if (-not $PyCommand) {
        return $null
    }

    $Detected = & py -3 -c "import sys; print(sys.executable)" 2>$null
    if ($LASTEXITCODE -ne 0) {
        return $null
    }

    return $Detected.Trim()
}

function Resolve-GraphifyPython {
    param([switch]$FullCheck)

    $Candidates = New-Object System.Collections.Generic.List[object]

    if (Test-Path -LiteralPath $PinnedPythonFile -PathType Leaf) {
        $Candidates.Add([pscustomobject]@{
                Source = "graphify-out/.graphify_python"
                Path   = (Get-Content -LiteralPath $PinnedPythonFile -Raw).Trim()
            })
    }

    if (-not [string]::IsNullOrWhiteSpace($env:GRAPHIFY_PYTHON)) {
        $Candidates.Add([pscustomobject]@{
                Source = "GRAPHIFY_PYTHON"
                Path   = $env:GRAPHIFY_PYTHON.Trim()
            })
    }

    $Candidates.Add([pscustomobject]@{
            Source = "known-good fallback"
            Path   = $KnownGoodPython
        })

    $PyLauncherPython = Get-PyLauncherPython
    if ($PyLauncherPython) {
        $Candidates.Add([pscustomobject]@{
                Source = "py -3"
                Path   = $PyLauncherPython
            })
    }

    foreach ($Name in @("python3", "python")) {
        $CommandSource = Get-CommandSource -Name $Name
        if ($CommandSource) {
            $Candidates.Add([pscustomobject]@{
                    Source = $Name
                    Path   = $CommandSource
                })
        }
    }

    $Seen = @{}
    foreach ($Candidate in $Candidates) {
        if ([string]::IsNullOrWhiteSpace($Candidate.Path)) {
            continue
        }

        $Key = $Candidate.Path.Trim().ToLowerInvariant()
        if ($Seen.ContainsKey($Key)) {
            continue
        }

        $Seen[$Key] = $true

        if (Test-GraphifyPython -PythonPath $Candidate.Path -FullCheck:$FullCheck) {
            Save-PinnedPython -PythonPath $Candidate.Path
            return [pscustomobject]@{
                Path   = (Resolve-Path -LiteralPath $Candidate.Path).Path
                Source = $Candidate.Source
            }
        }
    }

    $PinnedExpectation = if (Test-Path -LiteralPath $PinnedPythonFile -PathType Leaf) {
        (Get-Content -LiteralPath $PinnedPythonFile -Raw).Trim()
    }
    else {
        "<missing>"
    }

    throw "Pinned Graphify interpreter missing or unhealthy. Expected $PinnedExpectation. On this machine the known-good interpreter is $KnownGoodPython."
}

function Get-RootTransientFiles {
    return @(Get-ChildItem -LiteralPath $RepoRoot -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -like ".graphify_*.json" })
}

function Move-RootTransientFiles {
    $TransientFiles = Get-RootTransientFiles
    foreach ($File in $TransientFiles) {
        Ensure-WorkDir
        Move-Item -LiteralPath $File.FullName -Destination (Join-Path $WorkDir $File.Name) -Force
    }
}

function Test-ManifestClean {
    $ManifestPath = Join-Path $GraphifyOutDir "manifest.json"
    if (-not (Test-Path -LiteralPath $ManifestPath -PathType Leaf)) {
        return @{
            IsClean  = $true
            Matches  = @()
            HasGraph = $false
        }
    }

    $ManifestText = (Get-Content -LiteralPath $ManifestPath -Raw).Replace("\", "/")
    $Disallowed = @(
        ".graphify-site/",
        "/graphify-out/",
        "/node_modules/",
        "/dist/",
        "/.codex/",
        ".graphify_analysis.json",
        ".graphify_ast.json",
        ".graphify_detect.json",
        ".graphify_extract.json",
        ".graphify_labels.json",
        ".graphify_semantic.json",
        ".log"
    )

    $Matches = @()
    foreach ($Pattern in $Disallowed) {
        if ($ManifestText.Contains($Pattern)) {
            $Matches += $Pattern
        }
    }

    return @{
        IsClean  = ($Matches.Count -eq 0)
        Matches  = $Matches
        HasGraph = $true
    }
}

function Test-GraphStateClean {
    $GraphPath = Join-Path $GraphifyOutDir "graph.json"
    if (-not (Test-Path -LiteralPath $GraphPath -PathType Leaf)) {
        return @{
            IsClean  = $true
            Matches  = @()
            HasGraph = $false
        }
    }

    $Disallowed = @(
        ".graphify-site/",
        ".codex/",
        "graphify-out/",
        "node_modules/",
        "dist/",
        ".graphify_analysis.json",
        ".graphify_ast.json",
        ".graphify_detect.json",
        ".graphify_extract.json",
        ".graphify_labels.json",
        ".graphify_semantic.json",
        ".log"
    )

    $Matches = @()
    foreach ($Pattern in $Disallowed) {
        if (Select-String -Path $GraphPath -Pattern $Pattern -SimpleMatch -Quiet) {
            $Matches += $Pattern
        }
    }

    return @{
        IsClean  = ($Matches.Count -eq 0)
        Matches  = $Matches
        HasGraph = $true
    }
}

function Archive-GraphifyState {
    $Targets = @(
        "graph.json",
        "GRAPH_REPORT.md",
        "graph.html",
        "GRAPH_TREE.html",
        "manifest.json",
        ".graphify_labels.json"
    )

    $Existing = @()
    foreach ($Target in $Targets) {
        $Path = Join-Path $GraphifyOutDir $Target
        if (Test-Path -LiteralPath $Path) {
            $Existing += $Path
        }
    }

    if ($Existing.Count -eq 0) {
        return
    }

    Ensure-GraphifyOutDir
    if (-not (Test-Path -LiteralPath $ArchiveDir -PathType Container)) {
        New-Item -ItemType Directory -Path $ArchiveDir | Out-Null
    }

    $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $ArchiveTarget = Join-Path $ArchiveDir $Stamp
    New-Item -ItemType Directory -Path $ArchiveTarget | Out-Null

    foreach ($Path in $Existing) {
        Move-Item -LiteralPath $Path -Destination (Join-Path $ArchiveTarget (Split-Path -Path $Path -Leaf)) -Force
    }

    Write-Host "Archived contaminated graph state to $ArchiveTarget"
}

function Get-GlobalSkillVersion {
    if (-not (Test-Path -LiteralPath $GlobalSkillVersionFile -PathType Leaf)) {
        return $null
    }

    return (Get-Content -LiteralPath $GlobalSkillVersionFile -Raw).Trim()
}

function Test-AnyApiKeyConfigured {
    foreach ($Name in @("OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "GEMINI_API_KEY", "DEEPSEEK_API_KEY", "KIMI_API_KEY")) {
        if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name))) {
            return $true
        }
    }

    return $false
}

function Invoke-Doctor {
    $Resolution = Resolve-GraphifyPython -FullCheck
    $Version = & $Resolution.Path -c "from importlib.metadata import version; print(version('graphifyy'))"
    if ($LASTEXITCODE -ne 0) {
        throw "Graphify runtime found but package version lookup failed."
    }

    $ManifestStatus = Test-ManifestClean
    $GraphStateStatus = Test-GraphStateClean
    $TransientFiles = @(Get-RootTransientFiles)
    $GlobalSkillVersion = Get-GlobalSkillVersion

    Write-Host "Graphify doctor"
    Write-Host "  repo root: $RepoRoot"
    Write-Host "  python: $($Resolution.Path)"
    Write-Host "  source: $($Resolution.Source)"
    Write-Host "  package: graphifyy $($Version.Trim())"
    Write-Host "  pinned metadata: $PinnedPythonFile"

    if ($TransientFiles.Count -eq 0) {
        Write-Host "  root transients: clean"
    }
    else {
        Write-Host "  root transients: $($TransientFiles.Name -join ', ')"
    }

    if (-not $ManifestStatus.HasGraph) {
        Write-Host "  manifest: missing (run graphify:update to generate)"
    }
    elseif ($ManifestStatus.IsClean) {
        Write-Host "  manifest: clean"
    }
    else {
        Write-Host "  manifest: contaminated by $($ManifestStatus.Matches -join ', ')"
    }

    if (-not $GraphStateStatus.HasGraph) {
        Write-Host "  graph state: missing (run graphify:update to generate)"
    }
    elseif ($GraphStateStatus.IsClean) {
        Write-Host "  graph state: clean"
    }
    else {
        Write-Host "  graph state: contaminated by $($GraphStateStatus.Matches -join ', ')"
    }

    if ($GlobalSkillVersion -and $GlobalSkillVersion -ne $Version.Trim()) {
        Write-Warning "Graphify skill metadata is out of sync with the runtime (skill $GlobalSkillVersion, package $($Version.Trim()))."
    }

    if (-not (Test-AnyApiKeyConfigured)) {
        Write-Warning "No Graphify LLM backend keys are configured. Full extract will fail here; AST-only update remains available."
    }

    if (
        $TransientFiles.Count -gt 0 `
        -or (-not $ManifestStatus.IsClean -and $ManifestStatus.HasGraph) `
        -or (-not $GraphStateStatus.IsClean -and $GraphStateStatus.HasGraph)
    ) {
        exit 1
    }

    exit 0
}

function Normalize-GraphifyCommandArgs {
    param([string[]]$ArgsToNormalize)

    $NormalizedArgs = @($ArgsToNormalize)
    if ($NormalizedArgs.Count -gt 2 -and $NormalizedArgs[0] -in @("query", "explain")) {
        return @($NormalizedArgs[0], ($NormalizedArgs[1..($NormalizedArgs.Count - 1)] -join " "))
    }

    return $NormalizedArgs
}

if (-not $CommandArgs -or $CommandArgs.Count -eq 0) {
    Show-Usage
    exit 1
}

Push-Location $RepoRoot
try {
    if ($CommandArgs[0] -eq "doctor") {
        Invoke-Doctor
    }

    if ($CommandArgs[0] -eq "hook-check") {
        try {
            $Resolution = Resolve-GraphifyPython
            $NormalizedCommandArgs = Normalize-GraphifyCommandArgs -ArgsToNormalize $CommandArgs
            $GraphifyArgs = @("-m", "graphify") + $NormalizedCommandArgs
            [void](Invoke-NativeCommand -FilePath $Resolution.Path -Arguments $GraphifyArgs -SuppressOutput)
        }
        catch {
            exit 0
        }

        exit 0
    }

    Move-RootTransientFiles

    if ($CommandArgs[0] -eq "update") {
        $ManifestStatus = Test-ManifestClean
        $GraphStateStatus = Test-GraphStateClean
        if (
            ($ManifestStatus.HasGraph -and -not $ManifestStatus.IsClean) `
            -or ($GraphStateStatus.HasGraph -and -not $GraphStateStatus.IsClean)
        ) {
            Archive-GraphifyState
        }
    }

    $Resolution = Resolve-GraphifyPython
    $NormalizedCommandArgs = Normalize-GraphifyCommandArgs -ArgsToNormalize $CommandArgs
    $GraphifyArgs = @("-m", "graphify") + $NormalizedCommandArgs
    $ExitCode = Invoke-NativeCommand -FilePath $Resolution.Path -Arguments $GraphifyArgs

    if ($ExitCode -eq 0) {
        Move-RootTransientFiles
    }

    exit $ExitCode
}
finally {
    Pop-Location
}
