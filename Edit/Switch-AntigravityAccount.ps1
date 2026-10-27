<#
.SYNOPSIS
    Smart Antigravity Account Switcher with Auto-Resume Checkpoint.
.DESCRIPTION
    Menyimpan state percakapan, menyalin instruksi resume ke clipboard,
    menukar kredensial akun, dan membuka kembali Antigravity dengan akun baru.
#>

param(
    [Parameter(Position=0)]
    [string]$TargetAccount,

    [Parameter()]
    [string]$ResumeInstruction = "Lanjutkan pengerjaan task sebelumnya dari bagian yang belum selesai. Periksa kondisi file terakhir di proyek dan tuntaskan seluruh implementasinya.",

    [Parameter()]
    [switch]$AutoMode,

    [Parameter()]
    [bool]$AutoSendResume = $true
)

$AntigravityDataPath = "$env:APPDATA\Antigravity"
$ProfilesStorePath   = "$env:APPDATA\Antigravity\Profiles"
$UserDataPath        = "$AntigravityDataPath\User"
$ProcessName         = "Antigravity"
$ActiveProfileFile   = Join-Path $AntigravityDataPath "active_profile.txt"
$CredHelperScript    = "D:\ProjekAntigravity\cred_helper.py"
$PromptCacheFile     = "D:\ProjekAntigravity\LAST_RESUME_PROMPT.txt"

# 1. Resolusi Folder Profil
function Resolve-ProfileFolder([string]$accountKey) {
    if (-not (Test-Path $ProfilesStorePath)) { return $null }
    if (-not $accountKey) { return $null }

    if (Test-Path (Join-Path $ProfilesStorePath $accountKey)) { return $accountKey }
    $matchDir = Get-ChildItem -Path $ProfilesStorePath -Directory | Where-Object { $_.Name -like "*$accountKey*" } | Select-Object -First 1
    if ($matchDir) { return $matchDir.Name }

    foreach ($d in (Get-ChildItem -Path $ProfilesStorePath -Directory)) {
        $storage = Join-Path $d.FullName "app_storage.json"
        if (Test-Path $storage) {
            try {
                $user = (Get-Content $storage -Raw | ConvertFrom-Json).'jetski.onboarding.lastLoginUsername'
                if ($user -and $user -like "*$accountKey*") { return $d.Name }
            } catch {}
        }
        $cred = Join-Path $d.FullName "credential.json"
        if (Test-Path $cred) {
            try {
                $cUser = (Get-Content $cred -Raw | ConvertFrom-Json).email
                if ($cUser -and $cUser -like "*$accountKey*") { return $d.Name }
            } catch {}
        }
    }
    return $null
}

function Get-AntigravityExePath {
    $exePath = "$env:LOCALAPPDATA\Programs\Antigravity\Antigravity.exe"
    if (-not (Test-Path $exePath)) { $exePath = "$env:PROGRAMFILES\Antigravity\Antigravity.exe" }
    return $exePath
}

# 2. Cek Akun Tujuan & Deteksi Profil Aktif
$currProfile = if (Test-Path $ActiveProfileFile) { (Get-Content $ActiveProfileFile -Raw).Trim() } else { "" }
$currentStoragePath = Join-Path $AntigravityDataPath "app_storage.json"
if (Test-Path $currentStoragePath) {
    try {
        $activeUserEmail = (Get-Content $currentStoragePath -Raw | ConvertFrom-Json).'jetski.onboarding.lastLoginUsername'
        if ($activeUserEmail) {
            $matchedFolder = Resolve-ProfileFolder $activeUserEmail
            if ($matchedFolder) { $currProfile = $matchedFolder }
        }
    } catch {}
}

function Get-BestAvailableProfile([string]$currentProf) {
    if (-not (Test-Path $ProfilesStorePath)) { return $null }
    $accountsFile = "D:\ProjekAntigravity\antigravity_accounts.json"
    $accountsData = $null
    if (Test-Path $accountsFile) {
        try { $accountsData = Get-Content $accountsFile -Raw | ConvertFrom-Json } catch {}
    }
    
    $profiles = Get-ChildItem -Path $ProfilesStorePath -Directory | Where-Object { $_.Name -ne $currentProf }
    if (-not $profiles) { return $null }

    $scoredProfiles = @()
    foreach ($p in $profiles) {
        $score = 0
        $pUser = ""
        $storage = Join-Path $p.FullName "app_storage.json"
        if (Test-Path $storage) {
            try { $pUser = (Get-Content $storage -Raw | ConvertFrom-Json).'jetski.onboarding.lastLoginUsername' } catch {}
        }
        if (-not $pUser) {
            $cred = Join-Path $p.FullName "credential.json"
            if (Test-Path $cred) {
                try { $pUser = (Get-Content $cred -Raw | ConvertFrom-Json).email } catch {}
            }
        }
        if ($pUser) {
            $uClean = ($pUser -split '@')[0].ToLower().Trim()
            if ($accountsData -and $accountsData.PSObject.Properties[$uClean]) {
                $q = $accountsData.$uClean.quota
                if ($q) {
                    if ($q.geminiWeekly -le 0 -or $q.gemini5h -le 0) {
                        $score = -10
                    } else {
                        $score = [math]::Min([int]$q.gemini5h, [int]$q.geminiWeekly)
                    }
                }
            }
        }
        $scoredProfiles += [PSCustomObject]@{
            Folder = $p.Name
            Score = $score
        }
    }
    $sorted = $scoredProfiles | Sort-Object -Property Score -Descending
    return $sorted[0].Folder
}

if (-not $TargetAccount) {
    # Otomatis cari profil cadangan selain akun aktif dengan kuota terbaik
    $TargetAccount = Get-BestAvailableProfile $currProfile
    if (-not $TargetAccount) {
        Write-Host "Tidak ada profil cadangan ditemukan di $ProfilesStorePath" -ForegroundColor Red
        return $false
    }
}

$resolvedFolderName = Resolve-ProfileFolder $TargetAccount
if (-not $resolvedFolderName) {
    # Fallback ke profil cadangan terbaik yang masih memiliki kuota
    $bestFallback = Get-BestAvailableProfile $currProfile
    if ($bestFallback) {
        $resolvedFolderName = $bestFallback
        Write-Host "Profil '$TargetAccount' belum tersimpan, dialihkan ke cadangan berkuota: $resolvedFolderName" -ForegroundColor Yellow
    } else {
        Write-Host "Profil '$TargetAccount' tidak ditemukan di $ProfilesStorePath" -ForegroundColor Red
        return $false
    }
}

$targetProfilePath = Join-Path $ProfilesStorePath $resolvedFolderName
$exePath = Get-AntigravityExePath
if (-not (Test-Path $exePath)) {
    Write-Host "Executable Antigravity tidak ditemukan di: $exePath" -ForegroundColor Red
    return $false
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   SMART ACCOUNT SWITCHER & RESUME CHECKPOINT          " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Target Akun        : $resolvedFolderName" -ForegroundColor Yellow

# 3. Siapkan Prompt Resume & Salin ke Clipboard
try {
    # Simpan ke file teks
    Set-Content -Path $PromptCacheFile -Value $ResumeInstruction -Force -Encoding UTF8
    
    # Salin ke Clipboard Windows via PowerShell PresentationCore
    Add-Type -AssemblyName PresentationCore -ErrorAction SilentlyContinue
    Add-Type -AssemblyName WindowsBase -ErrorAction SilentlyContinue
    [System.Windows.Clipboard]::SetText($ResumeInstruction)
    Write-Host "[OK] Instruksi Resume Berhasil Disalin ke Clipboard!" -ForegroundColor Green
    Write-Host "    Isi Prompt: `"$ResumeInstruction`"" -ForegroundColor Gray
} catch {
    try {
        Set-Clipboard -Value $ResumeInstruction
        Write-Host "[OK] Instruksi Resume Disalin via Set-Clipboard!" -ForegroundColor Green
    } catch {
        try {
            cmd.exe /c "type `"$PromptCacheFile`" | clip"
            Write-Host "[OK] Instruksi Resume Disalin via Windows Clip!" -ForegroundColor Green
        } catch {
            Write-Host "[!] Gagal menyalin ke clipboard: $_" -ForegroundColor Yellow
        }
    }
}

# 4. Sinkronisasi State Percakapan & Layout Tab ke Profil Tujuan
$currentStoragePath = Join-Path $AntigravityDataPath "app_storage.json"
$targetStoragePath  = Join-Path $targetProfilePath "app_storage.json"
if ((Test-Path $currentStoragePath) -and (Test-Path $targetStoragePath)) {
    try {
        Write-Host "[1/4] Mengamankan riwayat percakapan & layout tab..." -ForegroundColor Cyan
        $curr = Get-Content $currentStoragePath -Raw | ConvertFrom-Json
        $target = Get-Content $targetStoragePath -Raw | ConvertFrom-Json

        foreach ($prop in $curr.PSObject.Properties) {
            $propName = $prop.Name
            if ($propName -like "antigravity-multi-conversation-layout-*" -or 
                $propName -eq "pinned_conversations_order" -or 
                $propName -eq "aux-pane-session" -or 
                $propName -eq "comments" -or
                $propName -eq "auxPaneWidth") {
                
                if ($target.PSObject.Properties[$propName]) {
                    $target.$propName = $curr.$propName
                } else {
                    $target | Add-Member -MemberType NoteProperty -Name $propName -Value $curr.$propName -Force
                }
            }
        }
        $target | ConvertTo-Json -Depth 25 | Set-Content $targetStoragePath -Force -Encoding UTF8
    } catch {
        Write-Host "[!] Peringatan saat sinkronisasi storage: $_" -ForegroundColor DarkGray
    }
}

# 4b. Cadangkan Sesi Akun Saat Ini ($currProfile) sebelum Beralih
if ($currProfile -and (Test-Path (Join-Path $ProfilesStorePath $currProfile))) {
    try {
        $activeBackupDir = Join-Path $ProfilesStorePath $currProfile
        Write-Host "[1b/4] Mencadangkan sesi akun saat ini ($currProfile)..." -ForegroundColor Cyan
        $authItems = @("Local Storage", "Session Storage", "Network", "app_storage.json", "Preferences", "Local State", "DIPS", "DIPS-wal")
        foreach ($item in $authItems) {
            $src = Join-Path $AntigravityDataPath $item
            $dst = Join-Path $activeBackupDir $item
            if (Test-Path $src) {
                Copy-Item -Path $src -Destination $dst -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
        if (Test-Path $CredHelperScript) {
            try { python $CredHelperScript backup "$activeBackupDir" 2>$null | Out-Null } catch {}
        }
    } catch {}
}

# 5. Tutup Antigravity dengan Bersih
Write-Host "[2/4] Menutup aplikasi Antigravity..." -ForegroundColor Yellow
$procs = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
if ($procs) {
    $procs | Stop-Process -Force
    Start-Sleep -Milliseconds 1800
}

# 6. Pulihkan Kredensial & File Sesi Akun Baru
Write-Host "[3/4] Memulihkan kredensial profil '$resolvedFolderName'..." -ForegroundColor Cyan
$authItems = @("Local Storage", "Session Storage", "Network", "app_storage.json", "Preferences", "Local State", "DIPS", "DIPS-wal")
$profileUserSubdir = Join-Path $targetProfilePath "User"

if (Test-Path $profileUserSubdir) {
    Copy-Item -Path $profileUserSubdir -Destination $UserDataPath -Recurse -Force -ErrorAction SilentlyContinue
} else {
    foreach ($item in $authItems) {
        $srcItem  = Join-Path $targetProfilePath $item
        $destItem = Join-Path $AntigravityDataPath $item
        if (Test-Path $srcItem) {
            if (Test-Path $destItem) {
                Remove-Item -Path $destItem -Recurse -Force -ErrorAction SilentlyContinue
            }
            Copy-Item -Path $srcItem -Destination $destItem -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# Pulihkan Token Windows Credential Manager
$credFile = Join-Path $targetProfilePath "credential.json"
if ((Test-Path $credFile) -and (Test-Path $CredHelperScript)) {
    try {
        python $CredHelperScript restore "$targetProfilePath" 2>$null | Out-Null
        Write-Host "    [OK] Token Windows Credential Manager berhasil dipulihkan." -ForegroundColor Green
    } catch {}
}

Set-Content -Path $ActiveProfileFile -Value $resolvedFolderName -Force

# 7. Buka Kembali Antigravity
Write-Host "[4/4] Membuka kembali Antigravity dengan akun baru..." -ForegroundColor Green
Start-Sleep -Milliseconds 800
$started = $false
try {
    $proc = Start-Process -FilePath $exePath -PassThru -ErrorAction SilentlyContinue
    if ($proc) { $started = $true }
} catch {}
if (-not $started) {
    try {
        Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList "`"$exePath`"" | Out-Null
        $started = $true
    } catch {}
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " SUKSES! Akun berhasil dialihkan ke: $resolvedFolderName" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Instruksi Lanjutan sudah siap di Clipboard:" -ForegroundColor Yellow
Write-Host "`"$ResumeInstruction`"" -ForegroundColor White
Write-Host "`n>> Cukup tekan Ctrl+V lalu Enter pada kolom chat Antigravity!" -ForegroundColor Cyan

# 8. Pengiriman Otomatis Instruksi Resume ke Chat yang Sedang Berjalan (Tanpa Membuka Task Baru)
if ($AutoSendResume) {
    Write-Host "[5/5] Memfokuskan chat yang sedang berjalan & mengirimkan instruksi resume..." -ForegroundColor Cyan
    Start-Sleep -Seconds 6

    # Helper Win32 untuk klik fokus ke chat box percakapan yang sedang aktif
    $winInputCode = @"
using System;
using System.Runtime.InteropServices;
public class WinChatFocus {
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }

    public static void ClickChatBox(IntPtr hWnd) {
        RECT r;
        if (hWnd != IntPtr.Zero && GetWindowRect(hWnd, out r)) {
            int w = r.Right - r.Left;
            int h = r.Bottom - r.Top;
            int clickX = r.Left + (int)(w * 0.78);
            int clickY = r.Top + (int)(h * 0.92);
            SetCursorPos(clickX, clickY);
            mouse_event(0x0002, 0, 0, 0, 0);
            System.Threading.Thread.Sleep(50);
            mouse_event(0x0004, 0, 0, 0, 0);
        }
    }
}
"@
    try { Add-Type -TypeDefinition $winInputCode -ErrorAction SilentlyContinue } catch {}

    $wshell = New-Object -ComObject WScript.Shell
    $sent = $false

    for ($attempt = 1; $attempt -le 10; $attempt++) {
        $mainProc = Get-CimInstance Win32_Process -Filter "Name = 'Antigravity.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -notmatch "--type=" } | Select-Object -First 1

        $activated = $false
        if ($mainProc) {
            $activated = $wshell.AppActivate($mainProc.ProcessId)
        }
        if (-not $activated) {
            $activated = $wshell.AppActivate("Antigravity")
        }

        if ($activated) {
            Start-Sleep -Milliseconds 800
            # Klik langsung ke kolom input chat percakapan lama (JANGAN tekan Ctrl+L karena itu membuat task baru!)
            try {
                $fgHwnd = [WinChatFocus]::GetForegroundWindow()
                [WinChatFocus]::ClickChatBox($fgHwnd)
                Start-Sleep -Milliseconds 300
            } catch {}

            $wshell.SendKeys("^v")
            Start-Sleep -Milliseconds 500
            $wshell.SendKeys("{ENTER}")
            $sent = $true
            Write-Host "    [OK] Instruksi resume berhasil dikirimkan ke chat yang sedang berjalan!" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 1
    }

    if (-not $sent) {
        Write-Host "    [i] Jendela Antigravity belum aktif, teks tetap aman di Clipboard (Ctrl+V)." -ForegroundColor Yellow
    }
}

return $true
