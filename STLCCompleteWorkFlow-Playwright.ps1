param(
    [Parameter(Mandatory = $true)]
    [string]$StoryId,

    [Parameter(Mandatory = $true)]
    [int]$SuiteId,

    [Parameter(Mandatory = $true)]
    [int]$TestPlanId,

    [Parameter(Mandatory = $false)]
    [int]$TestCaseId,

    [Parameter(Mandatory = $false)]
    [string]$Project = "Cadency",

    [Parameter(Mandatory = $false)]
    [string]$ApprovedWorkbookPath = "",

    [Parameter(Mandatory = $false)]
    [switch]$GenerateOnly,

    [Parameter(Mandatory = $false)]
    [switch]$UploadOnly,

    [Parameter(Mandatory = $false)]
    [switch]$ExecuteOnly,

    [Parameter(Mandatory = $false)]
    [switch]$SkipExecution,

    [Parameter(Mandatory = $false)]
    [switch]$AutoUpload,

    [Parameter(Mandatory = $false)]
    [ValidateSet("yes", "no")]
    [string]$ApproveUpload,

    [Parameter(Mandatory = $false)]
    [switch]$Headless
)

$modeCount = @($GenerateOnly, $UploadOnly, $ExecuteOnly) | Where-Object { $_ } | Measure-Object | Select-Object -ExpandProperty Count
if ($modeCount -gt 1) {
    Write-Error "Use only one of -GenerateOnly, -UploadOnly, or -ExecuteOnly."
    exit 1
}

function Invoke-WorkflowStep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StepTitle,

        [Parameter(Mandatory = $true)]
        [string[]]$CliArgs
    )

    Write-Host $StepTitle -ForegroundColor Green
    Write-Host ("npm run workflow:playwright -- " + ($CliArgs -join " ")) -ForegroundColor DarkGray
    Write-Host ""

    $npmCommand = if (Get-Command "npm.cmd" -ErrorAction SilentlyContinue) { "npm.cmd" } else { "npm" }
    & $npmCommand "run" "workflow:playwright" "--" @CliArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "$StepTitle failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
}

function Get-LatestGeneratedExcelPath {
    param([string]$TargetStoryId)

    $generatedExcelRoot = Join-Path $PSScriptRoot "artifacts\generated-excel"
    if (-not (Test-Path $generatedExcelRoot)) {
        return $null
    }

    $latest = Get-ChildItem -Path $generatedExcelRoot -File -Filter "*.xlsx" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.Name -notlike '~$*' -and (
                $_.BaseName -eq $TargetStoryId -or
                $_.Name -like "*$TargetStoryId*"
            )
        } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latest) {
        return $null
    }

    return $latest.FullName
}

function Get-GeneratedWorkbookPathFromArtifacts {
    param([string]$TargetStoryId)

    $artifactPath = Join-Path $PSScriptRoot ("artifacts\stories\" + $TargetStoryId + "\workbook-generation-plan.json")
    if (-not (Test-Path $artifactPath)) {
        return $null
    }

    try {
        $json = Get-Content -Raw $artifactPath | ConvertFrom-Json
        if ($json.generatedWorkbookPath -and (Test-Path $json.generatedWorkbookPath)) {
            return [string]$json.generatedWorkbookPath
        }
    } catch {
        return $null
    }

    return $null
}

function Open-WorkbookForReview {
    param([string]$WorkbookPath)

    if (-not $WorkbookPath -or -not (Test-Path $WorkbookPath)) {
        return $false
    }

    try {
        Start-Process -FilePath $WorkbookPath | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Request-UploadApproval {
    param(
        [string]$TargetStoryId,
        [int]$TargetSuiteId,
        [int]$TargetPlanId
    )

    $workbookPath = Get-GeneratedWorkbookPathFromArtifacts -TargetStoryId $TargetStoryId
    if (-not $workbookPath) {
        $workbookPath = Get-LatestGeneratedExcelPath -TargetStoryId $TargetStoryId
    }
    if ($workbookPath) {
        if (Open-WorkbookForReview -WorkbookPath $workbookPath) {
            Write-Host "Opened workbook for review: $workbookPath" -ForegroundColor DarkYellow
        } else {
            Write-Host "Could not auto-open the workbook. Review it manually under artifacts\\generated-excel." -ForegroundColor Yellow
        }
    }

    $message = @"
Review the generated workbook, save your edits, and confirm upload.

Story ID : $TargetStoryId
Suite ID : $TargetSuiteId
Plan ID  : $TargetPlanId
"@

    try {
        Add-Type -AssemblyName System.Windows.Forms | Out-Null
        $result = [System.Windows.Forms.MessageBox]::Show(
            $message,
            "Approve STLCFlow Upload",
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Question,
            [System.Windows.Forms.MessageBoxDefaultButton]::Button2
        )
        return ($result -eq [System.Windows.Forms.DialogResult]::Yes)
    } catch {
        $approval = Read-Host "Type 'y' to continue with upload"
        if ($null -eq $approval) {
            $approval = ""
        }
        return ($approval.Trim().ToLowerInvariant() -in @("y", "yes"))
    }
}

$baseArgs = @(
    "--story-id=$StoryId",
    "--suite-id=$SuiteId",
    "--test-plan-id=$TestPlanId",
    "--project=$Project"
)

if ($PSBoundParameters.ContainsKey("TestCaseId")) {
    $baseArgs += "--test-case-id=$TestCaseId"
}

if ($ApprovedWorkbookPath) {
    $baseArgs += "--approved-workbook=$ApprovedWorkbookPath"
}

if ($Headless) {
    $baseArgs += "--headless"
}

Write-Host "=== STLCFlow Playwright Workflow ===" -ForegroundColor Cyan
Write-Host "Story ID : $StoryId" -ForegroundColor Yellow
Write-Host "Suite ID : $SuiteId" -ForegroundColor Yellow
Write-Host "Plan ID  : $TestPlanId" -ForegroundColor Yellow
if ($PSBoundParameters.ContainsKey("TestCaseId")) {
    Write-Host "Case ID  : $TestCaseId" -ForegroundColor Yellow
}
Write-Host "Project  : $Project" -ForegroundColor Yellow
Write-Host "Browser  : $(if ($Headless) { 'Headless' } else { 'Headed' })" -ForegroundColor Yellow
Write-Host ""

if ($ExecuteOnly) {
    $executeArgs = @($baseArgs + @("--execute-only", "--review-approved"))
    Invoke-WorkflowStep -StepTitle "Step 1: Running uploaded testcase automation..." -CliArgs $executeArgs
    return
}

if ($UploadOnly) {
    $uploadArgs = @($baseArgs + @("--upload-only", "--review-approved"))
    Invoke-WorkflowStep -StepTitle "Step 1: Uploading reviewed workbook..." -CliArgs $uploadArgs
    return
}

$generateArgs = @($baseArgs + @("--generate-only"))
Invoke-WorkflowStep -StepTitle "Step 1: Generating testcase workbook..." -CliArgs $generateArgs

Write-Host ""
Write-Host "Step 2: Review the workbook under artifacts\\generated-excel and save any edits." -ForegroundColor Yellow
if ($GenerateOnly) {
    Write-Host "Generation completed. Resume later with -UploadOnly or rerun this script for the full flow." -ForegroundColor Green
    return
}

if (-not $ApprovedWorkbookPath) {
    $generatedWorkbookPath = Get-GeneratedWorkbookPathFromArtifacts -TargetStoryId $StoryId
    if ($generatedWorkbookPath) {
        $ApprovedWorkbookPath = $generatedWorkbookPath
        $baseArgs += "--approved-workbook=$ApprovedWorkbookPath"
    }
}

$approved = $false
if ($AutoUpload) {
    $approved = $true
    Write-Host "Auto-upload is enabled. Continuing without prompt." -ForegroundColor DarkYellow
} elseif ($PSBoundParameters.ContainsKey("ApproveUpload")) {
    $approved = ($ApproveUpload -eq "yes")
    Write-Host "Using supplied upload approval value: $ApproveUpload" -ForegroundColor DarkYellow
} else {
    $approved = Request-UploadApproval -TargetStoryId $StoryId -TargetSuiteId $SuiteId -TargetPlanId $TestPlanId
}

if (-not $approved) {
    Write-Host "Upload cancelled after review." -ForegroundColor Yellow
    return
}

$uploadArgs = @($baseArgs + @("--upload-only", "--review-approved"))
Invoke-WorkflowStep -StepTitle "Step 3: Uploading reviewed workbook..." -CliArgs $uploadArgs

if ($SkipExecution) {
    Write-Host "Step 4: Execution skipped by request." -ForegroundColor DarkYellow
    return
}

$executeArgs = @($baseArgs + @("--execute-only", "--review-approved"))
Invoke-WorkflowStep -StepTitle "Step 4: Running generated automation and publishing results..." -CliArgs $executeArgs
