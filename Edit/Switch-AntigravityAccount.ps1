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

# 5. Tutup Antigravity dengan Bersih & Tunggu Hingga Benar-benar Berhenti
Write-Host "[2/4] Menutup aplikasi Antigravity..." -ForegroundColor Yellow
$procs = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
if ($procs) {
    foreach ($p in $procs) {
        try { $p.CloseMainWindow() | Out-Null } catch {}
    }
    Start-Sleep -Milliseconds 1200

    $remaining = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($remaining) {
        $remaining | Stop-Process -Force -ErrorAction SilentlyContinue
    }

    # Tunggu sampai seluruh proses Antigravity benar-benar keluar (Maksimal 8 detik)
    $maxWait = 16
    while ((Get-Process -Name $ProcessName -ErrorAction SilentlyContinue) -and ($maxWait -gt 0)) {
        Start-Sleep -Milliseconds 500
        $maxWait--
    }
}

# 5b. Cadangkan Sesi Akun Sebelumnya ($currProfile) setelah Antigravity Ditutup Penuh
if ($currProfile -and (Test-Path (Join-Path $ProfilesStorePath $currProfile))) {
    try {
        $activeBackupDir = Join-Path $ProfilesStorePath $currProfile
        Write-Host "[2b/4] Mencadangkan sesi akun sebelumnya ($currProfile)..." -ForegroundColor Cyan
        $authFolders = @("Local Storage", "Session Storage", "Network")
        foreach ($folder in $authFolders) {
            $srcFolder = Join-Path $AntigravityDataPath $folder
            $destFolder = Join-Path $activeBackupDir $folder
            if (Test-Path $srcFolder) {
                robocopy "$srcFolder" "$destFolder" /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
            }
        }
        $authFiles = @("app_storage.json", "Preferences", "Local State", "DIPS", "DIPS-wal")
        foreach ($file in $authFiles) {
            $srcFile = Join-Path $AntigravityDataPath $file
            $destFile = Join-Path $activeBackupDir $file
            if (Test-Path $srcFile) {
                Copy-Item -Path $srcFile -Destination $destFile -Force -ErrorAction SilentlyContinue
            }
        }
        if (Test-Path $CredHelperScript) {
            try { python $CredHelperScript backup "$activeBackupDir" 2>$null | Out-Null } catch {}
        }
    } catch {}
}

# Hapus stale lockfile agar instance baru tidak langsung exit
$lockFiles = @(
    Join-Path $AntigravityDataPath "lockfile",
    Join-Path $AntigravityDataPath "SingletonLock",
    Join-Path $AntigravityDataPath "SingletonCookie",
    Join-Path $AntigravityDataPath "SingletonSocket"
)
foreach ($lf in $lockFiles) {
    if (Test-Path $lf) {
        Remove-Item -Path $lf -Force -ErrorAction SilentlyContinue
    }
}

# 6. Pulihkan Kredensial & File Sesi Akun Baru
Write-Host "[3/4] Memulihkan kredensial profil '$resolvedFolderName'..." -ForegroundColor Cyan

# A. Sinkronisasi folder sesi menggunakan robocopy (mencegah folder bertingkat/nested)
$authFolders = @("Local Storage", "Session Storage", "Network")
foreach ($folder in $authFolders) {
    $srcFolder = Join-Path $targetProfilePath $folder
    $destFolder = Join-Path $AntigravityDataPath $folder
    if (Test-Path $srcFolder) {
        if (-not (Test-Path $destFolder)) {
            New-Item -ItemType Directory -Path $destFolder -Force -ErrorAction SilentlyContinue | Out-Null
        }
        robocopy "$srcFolder" "$destFolder" /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS | Out-Null
    }
}

# B. Salin file konfigurasi individual
$authFiles = @("app_storage.json", "Preferences", "Local State", "DIPS", "DIPS-wal")
foreach ($file in $authFiles) {
    $srcFile = Join-Path $targetProfilePath $file
    $destFile = Join-Path $AntigravityDataPath $file
    if (Test-Path $srcFile) {
        Copy-Item -Path $srcFile -Destination $destFile -Force -ErrorAction SilentlyContinue
    }
}

# C. Pulihkan Token Windows Credential Manager
$credFile = Join-Path $targetProfilePath "credential.json"
if ((Test-Path $credFile) -and (Test-Path $CredHelperScript)) {
    try {
        $restoreOutput = python $CredHelperScript restore "$targetProfilePath" 2>&1
        Write-Host "    [OK] Token Windows Credential Manager: $restoreOutput" -ForegroundColor Green
    } catch {
        Write-Host "    [!] Gagal memulihkan Credential Manager: $_" -ForegroundColor Yellow
    }
}

Set-Content -Path $ActiveProfileFile -Value $resolvedFolderName -Force

# 7. Buka Kembali Antigravity (Memuat kembali Workspace Aktif di Desktop Foreground)
Write-Host "[4/4] Membuka kembali Antigravity dengan akun baru..." -ForegroundColor Green
Start-Sleep -Milliseconds 1200
$started = $false
$workspaceArg = "D:\ProjekAntigravity"

try {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $exePath
    $psi.Arguments = "`"$workspaceArg`""
    $psi.WorkingDirectory = "D:\ProjekAntigravity"
    $psi.UseShellExecute = $true
    $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal
    $proc = [System.Diagnostics.Process]::Start($psi)
    if ($proc) { $started = $true }
} catch {
    Write-Host "[!] Gagal membuka Antigravity via ProcessStartInfo: $_" -ForegroundColor Yellow
}

if (-not $started) {
    try {
        $proc = Start-Process -FilePath $exePath -ArgumentList "`"$workspaceArg`"" -WorkingDirectory "D:\ProjekAntigravity" -WindowStyle Normal -PassThru
        if ($proc) { $started = $true }
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
    Start-Sleep -Seconds 9

    # Helper Win32 untuk pencarian jendela utama, force foreground, dan klik input chat
    $winInputCode = @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public class WinChatFocus {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, uint dwExtraInfo);
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);

    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }

    public static IntPtr FindMainWindow(int[] pids) {
        var pidSet = new HashSet<int>(pids);
        IntPtr bestHwnd = IntPtr.Zero;
        int maxArea = 0;

        EnumWindows((hWnd, lParam) => {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pidSet.Contains((int)pid)) {
                RECT r;
                if (GetWindowRect(hWnd, out r)) {
                    int w = r.Right - r.Left;
                    int h = r.Bottom - r.Top;
                    int area = w * h;
                    if (w > 400 && h > 300 && area > maxArea) {
                        maxArea = area;
                        bestHwnd = hWnd;
                    }
                }
            }
            return true;
        }, IntPtr.Zero);

        return bestHwnd;
    }

    public static bool ActivateWindow(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return false;
        if (IsIconic(hWnd)) {
            ShowWindowAsync(hWnd, 9); // SW_RESTORE
        }
        // Dummy Alt tap untuk bypass Windows foreground lockout
        keybd_event(0x12, 0, 0, 0);
        keybd_event(0x12, 0, 2, 0);

        uint foreThread = GetWindowThreadProcessId(GetForegroundWindow(), IntPtr.Zero);
        uint appThread = GetCurrentThreadId();
        if (foreThread != appThread) {
            AttachThreadInput(foreThread, appThread, true);
            BringWindowToTop(hWnd);
            SetForegroundWindow(hWnd);
            AttachThreadInput(foreThread, appThread, false);
        } else {
            BringWindowToTop(hWnd);
            SetForegroundWindow(hWnd);
        }
        return true;
    }

    public static void ClickChatBox(IntPtr hWnd) {
        RECT r;
        if (hWnd != IntPtr.Zero && GetWindowRect(hWnd, out r)) {
            int w = r.Right - r.Left;
            int h = r.Bottom - r.Top;
            // Area input chat box di Antigravity 2.0 (tengah bawah)
            int clickX = r.Left + (int)(w * 0.48);
            int clickY = r.Top + (int)(h * 0.93);
            SetCursorPos(clickX, clickY);
            mouse_event(0x0002, 0, 0, 0, 0);
            System.Threading.Thread.Sleep(60);
            mouse_event(0x0004, 0, 0, 0, 0);
        }
    }
}
"@
    try { Add-Type -TypeDefinition $winInputCode -ErrorAction SilentlyContinue } catch {}

    $wshell = New-Object -ComObject WScript.Shell
    $sent = $false

    for ($attempt = 1; $attempt -le 20; $attempt++) {
        $pids = @(Get-Process -Name Antigravity -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
        $hwnd = [IntPtr]::Zero
        if ($pids.Count -gt 0) {
            try {
                [int[]]$arrPids = $pids
                $hwnd = [WinChatFocus]::FindMainWindow($arrPids)
            } catch {}
        }

        # Fallback jika FindMainWindow belum mendeteksi atau handle via AppActivate
        $isActivated = $false
        if ($hwnd -ne [IntPtr]::Zero) {
            $isActivated = [WinChatFocus]::ActivateWindow($hwnd)
        } else {
            $mainProc = Get-CimInstance Win32_Process -Filter "Name = 'Antigravity.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -notmatch "--type=" } | Select-Object -First 1
            if ($mainProc) {
                $isActivated = $wshell.AppActivate($mainProc.ProcessId)
            }
            if (-not $isActivated) {
                $isActivated = $wshell.AppActivate("Antigravity")
            }
        }

        # Jika sudah berhasil diaktifkan dan jendela siap
        if ($isActivated) {
            # Tunggu 2 detik agar webview chat Antigravity selesai loading DOM percakapan
            Start-Sleep -Milliseconds 2000

            # Pastikan teks resume ada di Clipboard
            try {
                Add-Type -AssemblyName PresentationCore -ErrorAction SilentlyContinue
                Add-Type -AssemblyName WindowsBase -ErrorAction SilentlyContinue
                [System.Windows.Clipboard]::SetText($ResumeInstruction)
            } catch {
                try { Set-Clipboard -Value $ResumeInstruction } catch {
                    try { cmd.exe /c "type `"$PromptCacheFile`" | clip" } catch {}
                }
            }

            # Klik langsung ke kolom input chat percakapan lama (JANGAN tekan Ctrl+L karena itu membuat task baru!)
            try {
                $fgHwnd = [WinChatFocus]::GetForegroundWindow()
                [WinChatFocus]::ClickChatBox($fgHwnd)
                Start-Sleep -Milliseconds 400
            } catch {}

            # Kirim Ctrl+V lalu Enter
            $wshell.SendKeys("^v")
            Start-Sleep -Milliseconds 600
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
