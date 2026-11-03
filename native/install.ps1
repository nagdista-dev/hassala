# Register or remove the Hassala native messaging host on Windows.
#
# Chrome, Edge, Brave, and Chromium find native hosts through a registry key
# under HKCU. The manifest itself lives in %LOCALAPPDATA%\Hassala.
#
# Usage (PowerShell):
#   powershell -ExecutionPolicy Bypass -File native\install.ps1 -ExtensionId <id>
#   powershell -ExecutionPolicy Bypass -File native\install.ps1 -Uninstall
#
# Get <id> from chrome://extensions (Developer mode) or from the Chrome Web
# Store listing after publishing. Unpacked extension IDs are derived from the
# folder path, so they change when the folder moves.

[CmdletBinding()]
param(
    [string]$ExtensionId = $env:HASSALA_EXT_ID,
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$HostName = 'com.hassala.writer'
$HostScript = Join-Path $Here 'hassala_writer.py'
$Launcher = Join-Path $Here 'hassala_writer.bat'
$HostDir = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Hassala'
$ManifestPath = Join-Path $HostDir "$HostName.json"

$RegistryKeys = @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName",
    "HKCU:\Software\Chromium\NativeMessagingHosts\$HostName",
    "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\$HostName",
    "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
)

function Remove-LegacyHosts {
    # Clean registrations left by older builds without hard-coding a personal
    # name or a previous extension ID.
    $BrowserRoots = @(
        "HKCU:\Software\Google\Chrome\NativeMessagingHosts",
        "HKCU:\Software\Chromium\NativeMessagingHosts",
        "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts",
        "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts"
    )
    foreach ($root in $BrowserRoots) {
        if (Test-Path -Path $root) {
            Get-ChildItem -Path $root -ErrorAction SilentlyContinue |
                Where-Object { $_.PSChildName -like '*obsidian_writer*' } |
                ForEach-Object {
                    Remove-Item -Path $_.PSPath -Recurse -Force
                    Write-Host "Removed legacy registry key: $($_.PSChildName)"
                }
        }
    }

    if (Test-Path -Path $HostDir) {
        Get-ChildItem -Path $HostDir -Filter 'com.*.obsidian_writer.json' -File -ErrorAction SilentlyContinue |
            ForEach-Object {
                Remove-Item -Path $_.FullName -Force
                Write-Host "Removed legacy manifest: $($_.FullName)"
            }
    }
}

function Remove-HassalaHost {
    foreach ($key in $RegistryKeys) {
        if (Test-Path -Path $key) {
            Remove-Item -Path $key -Recurse -Force
            Write-Host "Removed registry key: $key"
        }
    }

    Remove-LegacyHosts

    if (Test-Path -Path $ManifestPath) {
        Remove-Item -Path $ManifestPath -Force
        Write-Host "Removed manifest: $ManifestPath"
    }
    Write-Host "Hassala native host removed."
}

if ($Uninstall) {
    Remove-HassalaHost
    exit 0
}

if (-not $ExtensionId) {
    Write-Error @"
Missing extension ID.

Open chrome://extensions (or brave://extensions / edge://extensions), enable
Developer mode, copy the ID shown under Hassala, then run:

  powershell -ExecutionPolicy Bypass -File native\install.ps1 -ExtensionId <id>

For a Chrome Web Store build, use the published extension ID instead.
"@
    exit 2
}

if ($ExtensionId -notmatch '^[a-p]{32}$') {
    Write-Error "Invalid extension ID. Expected 32 characters in the range a-p."
    exit 2
}

if (-not (Test-Path -Path $HostScript)) {
    Write-Error "Missing host script: $HostScript"
    exit 1
}

if (-not (Test-Path -Path $Launcher)) {
    Write-Error "Missing host launcher: $Launcher"
    exit 1
}

Remove-LegacyHosts

New-Item -ItemType Directory -Path $HostDir -Force | Out-Null
$manifest = @{
    name = $HostName
    description = 'Hassala word bank writer (Markdown)'
    path = $Launcher
    type = 'stdio'
    allowed_origins = @("chrome-extension://$ExtensionId/")
} | ConvertTo-Json -Depth 4

[IO.File]::WriteAllText($ManifestPath, $manifest, [Text.UTF8Encoding]::new($false))

foreach ($key in $RegistryKeys) {
    New-Item -Path $key -Force | Out-Null
    Set-Item -Path $key -Value $ManifestPath
    Write-Host "Installed: $key"
}

Write-Host ""
Write-Host "Host name:      $HostName"
Write-Host "Extension ID:   $ExtensionId"
Write-Host "Manifest:       $ManifestPath"
Write-Host "Host launcher:  $Launcher"
Write-Host ""
Write-Host "Reload the extension, then open its settings to verify the connection."
