# Antigravity Pro Minimalist Live Desktop Widget (WPF / Native Windows)
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Windows.Forms, System.Drawing

# 1. Win32 API: Hide Console & DestroyIcon (Mencegah GDI Handle Memory Leak di System Tray)
$winApiCode = @"
    [DllImport("Kernel32.dll")] public static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, Int32 nCmdShow);
    [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern bool DestroyIcon(IntPtr handle);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
"@
try {
    Add-Type -Name WinAPI -Namespace Win32 -MemberDefinition $winApiCode -ErrorAction SilentlyContinue
    $console = [Win32.WinAPI]::GetConsoleWindow()
    if ($console -ne [IntPtr]::Zero) {
        [Win32.WinAPI]::ShowWindow($console, 0) | Out-Null
    }
} catch {}

$robloxGuardCode = @"
using System;
using System.Runtime.InteropServices;

public class RobloxGuard {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsIconic(IntPtr hWnd);

    public static bool HasActiveOrMinimizedWindow(int targetPid) {
        bool hasWindow = false;
        EnumWindows((hWnd, lParam) => {
            uint pid;
            GetWindowThreadProcessId(hWnd, out pid);
            if (pid == targetPid) {
                if (IsWindowVisible(hWnd) || IsIconic(hWnd)) {
                    hasWindow = true;
                    return false;
                }
            }
            return true;
        }, IntPtr.Zero);
        return hasWindow;
    }
}
"@
try {
    Add-Type -TypeDefinition $robloxGuardCode -ErrorAction SilentlyContinue
} catch {}



# 2. Config Paths & High-Speed Cache State
$script:profilesPath      = "C:\Users\edvan\AppData\Roaming\Antigravity\Profiles"
$script:brainPath         = "C:\Users\edvan\.gemini\antigravity\brain"
$script:registryFile      = "D:\ProjekAntigravity\antigravity_accounts.json"
$script:selectedProfile   = ""
$script:currentRegistry   = $null
$script:currentActiveUser = "edvannr9191"
$script:transcriptCache   = @{}
$script:lsCsrf            = $null
$script:lsPort            = $null
$script:lsPid             = $null
$script:lastLsCheck       = [DateTime]::MinValue
$script:isPinned          = $false
$script:cardUiMap         = @{}
$script:cachedActiveTokens= $null
$script:cachedActiveTokensUser = ""
$script:lastTokenScan     = [DateTime]::MinValue
$script:cachedGlobalTotals = $null
$script:lastGlobalScan     = [DateTime]::MinValue
$script:cachedTaskInfo    = [PSCustomObject]@{ status = "IDLE"; chats = @("Tidak ada task aktif") }
$script:taskProcess       = $null
$script:taskProcessStart  = [DateTime]::MinValue
$script:lastTaskPollTime  = [DateTime]::MinValue
$script:trayAnimFrame     = 0
$script:lastTrayPct       = -1
$script:lastTrayRunning   = $false

$script:appIconPath = "D:\ProjekAntigravity\antigravity_widget.ico"
$script:transparentIconPath = "D:\ProjekAntigravity\transparent.ico"
if (-not (Test-Path $script:transparentIconPath)) {
    try {
        $bmpTrans = [System.Drawing.Bitmap]::new(32, 32)
        $bmpTrans.MakeTransparent()
        $hIconTrans = $bmpTrans.GetHicon()
        $iconObj = [System.Drawing.Icon]::FromHandle($hIconTrans)
        $fs = [System.IO.FileStream]::new($script:transparentIconPath, [System.IO.FileMode]::Create)
        $iconObj.Save($fs)
        $fs.Close()
        $fs.Dispose()
        $iconObj.Dispose()
        $bmpTrans.Dispose()
        [Win32.WinAPI]::DestroyIcon($hIconTrans) | Out-Null
    } catch {}
}

# 3. Clean Minimalist XAML (Auto-Fit Height, Tanpa Footer, Perfect Center Controls)
[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Antigravity Monitor"
        Width="410" SizeToContent="Height"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        Topmost="False"
        WindowStartupLocation="Manual"
        ShowInTaskbar="False"
        FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif">
    <Window.Resources>
        <!-- Style Tombol Utama (Content Stretch agar Card Mengisi Penuh) -->
        <Style TargetType="Button">
            <Setter Property="FocusVisualStyle" Value="{x:Null}"/>
            <Setter Property="Cursor" Value="Hand"/>
            <Setter Property="HorizontalContentAlignment" Value="Stretch"/>
            <Setter Property="VerticalContentAlignment" Value="Center"/>
            <Setter Property="Padding" Value="0"/>
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="Button">
                        <Border Name="btnBorder" Background="{TemplateBinding Background}" 
                                BorderBrush="{TemplateBinding BorderBrush}" 
                                BorderThickness="{TemplateBinding BorderThickness}" 
                                CornerRadius="6"
                                Padding="{TemplateBinding Padding}">
                            <ContentPresenter HorizontalAlignment="{TemplateBinding HorizontalContentAlignment}" 
                                              VerticalAlignment="{TemplateBinding VerticalContentAlignment}"/>
                        </Border>
                        <ControlTemplate.Triggers>
                            <Trigger Property="IsMouseOver" Value="True">
                                <Setter TargetName="btnBorder" Property="Opacity" Value="0.88"/>
                            </Trigger>
                            <Trigger Property="IsPressed" Value="True">
                                <Setter TargetName="btnBorder" Property="Opacity" Value="0.72"/>
                            </Trigger>
                        </ControlTemplate.Triggers>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>

        <Style TargetType="ProgressBar">
            <Setter Property="Template">
                <Setter.Value>
                    <ControlTemplate TargetType="ProgressBar">
                        <Border Background="{TemplateBinding Background}" CornerRadius="2.5">
                            <Grid Name="PART_Track">
                                <Border Name="PART_Indicator" Background="{TemplateBinding Foreground}" CornerRadius="2.5" HorizontalAlignment="Left"/>
                            </Grid>
                        </Border>
                    </ControlTemplate>
                </Setter.Value>
            </Setter>
        </Style>
    </Window.Resources>

    <!-- Outer Shadow Padding -->
    <Grid Margin="10">
        <Border Name="FullViewPanel" CornerRadius="14" Background="#CC0B1220" BorderBrush="#384C66" BorderThickness="1">
            <Border.Effect>
                <DropShadowEffect BlurRadius="24" ShadowDepth="4" Direction="270" Color="#000000" Opacity="0.55"/>
            </Border.Effect>
            
            <StackPanel Margin="16,14,16,16">
                
                <!-- 1. HEADER BAR (Draggable) -->
                <Grid Name="HeaderBar" Background="Transparent" Cursor="SizeAll" Margin="0,0,0,12">
                    <Grid.ColumnDefinitions>
                        <ColumnDefinition Width="Auto"/>
                        <ColumnDefinition Width="*"/>
                        <ColumnDefinition Width="Auto"/>
                    </Grid.ColumnDefinitions>

                    <!-- App Logo & Title -->
                    <StackPanel Grid.Column="0" Orientation="Horizontal" VerticalAlignment="Center">
                        <Border Width="24" Height="24" CornerRadius="6" Background="#5916243A" BorderBrush="#2B3C54" BorderThickness="1" Margin="0,0,8,0">
                            <Image Source="D:\ProjekAntigravity\antigravity_logo.png" Width="18" Height="18" RenderOptions.BitmapScalingMode="HighQuality" HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Border>
                        <StackPanel VerticalAlignment="Center">
                            <TextBlock Text="Antigravity" FontSize="12.5" FontWeight="SemiBold" Foreground="#F8FAFC" FontFamily="Segoe UI"/>
                        </StackPanel>
                    </StackPanel>
                    <!-- Active Account Pill in Header -->
                    <Border Grid.Column="1" HorizontalAlignment="Right" VerticalAlignment="Center" Background="#4D0D211B" BorderBrush="#14533C" BorderThickness="1" CornerRadius="5" Padding="7,2.5" Margin="0,0,8,0">
                        <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                            <Ellipse Width="5" Height="5" Fill="#10B981" Margin="0,0,5,0" VerticalAlignment="Center"/>
                            <TextBlock Text="ACTIVE: " FontSize="8.5" FontWeight="Bold" Foreground="#6EE7B7" VerticalAlignment="Center"/>
                            <TextBlock Name="TxtActiveAccount" Text="edvanwlf" FontSize="9.5" FontWeight="Bold" Foreground="#34D399" VerticalAlignment="Center" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif"/>
                        </StackPanel>
                    </Border>

                    <!-- Window Action Buttons (Presisi Ditengah Kotak) -->
                    <StackPanel Grid.Column="2" Orientation="Horizontal" VerticalAlignment="Center">
                        <!-- Tombol PIN (Default: Desktop Mode, Klik untuk Pinned Always On Top) -->
                        <Button Name="BtnPin" Width="34" Height="22" Background="#5916243A" BorderBrush="#2B3C54" BorderThickness="1" HorizontalContentAlignment="Center" VerticalContentAlignment="Center" Margin="0,0,4,0" ToolTip="Klik untuk menampilkan widget selalu di atas aplikasi lain (PIN)">
                            <TextBlock Name="TxtBtnPin" Text="PIN" FontSize="8.5" FontWeight="Bold" Foreground="#94A3B8" HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Button>

                        <!-- Tombol Minimize (-) Vector Presisi Center -->
                        <Button Name="BtnMinimize" Width="22" Height="22" Background="#5916243A" BorderBrush="#2B3C54" BorderThickness="1" HorizontalContentAlignment="Center" VerticalContentAlignment="Center" Margin="0,0,4,0">
                            <Border Width="8" Height="2" Background="#94A3B8" CornerRadius="0.5" HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Button>

                        <!-- Tombol Close (X) Vector Presisi Center -->
                        <Button Name="BtnClose" Width="22" Height="22" Background="#5916243A" BorderBrush="#2B3C54" BorderThickness="1" HorizontalContentAlignment="Center" VerticalContentAlignment="Center">
                            <Path Data="M 0 0 L 7 7 M 0 7 L 7 0" Stroke="#94A3B8" StrokeThickness="1.5" StrokeStartLineCap="Round" StrokeEndLineCap="Round" HorizontalAlignment="Center" VerticalAlignment="Center"/>
                        </Button>
                    </StackPanel>
                </Grid>

                <!-- 2. GLOBAL SUMMARY HERO CARD (Total + Global Input/Output/Cache + Est. Biaya) -->
                <Border CornerRadius="10" Background="#59132036" BorderBrush="#293B52" BorderThickness="1" Padding="12,10" Margin="0,0,0,10">
                    <StackPanel>
                        <Grid>
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="Auto"/>
                            </Grid.ColumnDefinitions>
                            <StackPanel Grid.Column="0" VerticalAlignment="Center">
                                <TextBlock Text="TOTAL TOKEN KESELURUHAN" FontSize="8.5" FontWeight="Bold" Foreground="#64748B"/>
                                <StackPanel Orientation="Horizontal" Margin="0,2,0,0">
                                    <TextBlock Text="Est. Nilai API: " FontSize="8.0" Foreground="#64748B"/>
                                    <TextBlock Name="TxtGrandTotalCost" Text="~$0.00 (Rp 0)" FontSize="8.0" FontWeight="SemiBold" Foreground="#34D399" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif"/>
                                </StackPanel>
                            </StackPanel>
                            <TextBlock Grid.Column="1" Name="TxtGrandTotalTokens" Text="0 M" FontSize="19" FontWeight="Bold" Foreground="#38BDF8" VerticalAlignment="Center" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif"/>
                        </Grid>

                        <Border Height="1" Background="#263E56" Margin="0,8,0,8"/>

                        <!-- Global Input / Output / Cache Breakdown -->
                        <UniformGrid Columns="3">
                            <StackPanel>
                                <StackPanel Orientation="Horizontal" Margin="0,0,0,2">
                                    <Ellipse Width="4" Height="4" Fill="#818CF8" VerticalAlignment="Center" Margin="0,0,4,0"/>
                                    <TextBlock Text="TOTAL INPUT" FontSize="8" FontWeight="SemiBold" Foreground="#64748B"/>
                                </StackPanel>
                                <TextBlock Name="TxtGlobalInput" Text="0 M" FontSize="11" FontWeight="Bold" Foreground="#E2E8F0" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" Margin="0,1,0,0"/>
                            </StackPanel>
                            <StackPanel>
                                <StackPanel Orientation="Horizontal" Margin="0,0,0,2">
                                    <Ellipse Width="4" Height="4" Fill="#34D399" VerticalAlignment="Center" Margin="0,0,4,0"/>
                                    <TextBlock Text="TOTAL OUTPUT" FontSize="8" FontWeight="SemiBold" Foreground="#64748B"/>
                                </StackPanel>
                                <TextBlock Name="TxtGlobalOutput" Text="0 M" FontSize="11" FontWeight="Bold" Foreground="#A7F3D0" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" Margin="0,1,0,0"/>
                            </StackPanel>
                            <StackPanel>
                                <StackPanel Orientation="Horizontal" Margin="0,0,0,2">
                                    <Ellipse Width="4" Height="4" Fill="#38BDF8" VerticalAlignment="Center" Margin="0,0,4,0"/>
                                    <TextBlock Text="TOTAL CACHE" FontSize="8" FontWeight="SemiBold" Foreground="#64748B"/>
                                </StackPanel>
                                <TextBlock Name="TxtGlobalCache" Text="0 B" FontSize="11" FontWeight="Bold" Foreground="#38BDF8" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" Margin="0,1,0,0"/>
                            </StackPanel>
                        </UniformGrid>
                    </StackPanel>
                </Border>

                <!-- 3. ACCOUNT SELECTOR & FEATURED QUOTA CARD (Tebal, Jelas, & Ringkas) -->
                <StackPanel Margin="0,0,0,10">
                    <!-- Clean Header: Label Kiri & Unified Account Selector Dropdown Kanan -->
                    <Grid Margin="1,0,1,7">
                        <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                            <TextBlock Text="MONITOR KUOTA AKUN" FontSize="8.5" FontWeight="Bold" Foreground="#64748B" VerticalAlignment="Center"/>
                            <TextBlock Name="TxtTotalAccountsCount" Text="(5 Akun)" FontSize="8.0" Foreground="#475569" FontWeight="SemiBold" VerticalAlignment="Center" Margin="6,0,0,0"/>
                        </StackPanel>

                        <!-- Single Unified Account Selector Dropdown Button -->
                        <Button Name="BtnAccountSelectorDropdown" HorizontalAlignment="Right" Padding="8,3.5" Background="#5916243A" BorderBrush="#2B3C54" BorderThickness="1" VerticalAlignment="Center">
                            <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                                <Ellipse Name="DotSelectedAccountBtn" Width="6" Height="6" Fill="#10B981" Margin="0,0,5,0" VerticalAlignment="Center"/>
                                <TextBlock Name="TxtSelectedAccountBtnLabel" Text="edvanaha" FontSize="9.5" FontWeight="Bold" Foreground="#F8FAFC" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" VerticalAlignment="Center" Margin="0,0,5,0"/>
                                <Border Name="BadgeSelectedAccountBtn" CornerRadius="3" Padding="4,1" Background="#4D0D211B" BorderBrush="#14533C" BorderThickness="1" Margin="0,0,6,0" VerticalAlignment="Center">
                                    <TextBlock Name="TxtBadgeSelectedAccountBtn" Text="AKTIF" FontSize="7.0" FontWeight="Bold" Foreground="#34D399"/>
                                </Border>
                                <!-- Vector Arrow -->
                                <Path Name="IconAccountDropdownArrow" Data="M 0 0 L 3.5 3.5 L 7 0" Stroke="#64748B" StrokeThickness="1.5" VerticalAlignment="Center"/>
                            </StackPanel>
                        </Button>
                    </Grid>

                    <!-- Expandable Dropdown List Panel untuk Semua Akun (2 Kolom Kesamping) -->
                    <Border Name="PanelAccountsDropdown" ClipToBounds="True" Visibility="Collapsed" Background="#E60D1728" BorderBrush="#384C66" BorderThickness="1" CornerRadius="8" Padding="6" Margin="0,0,0,8">
                        <StackPanel>
                            <TextBlock Text="PILIH AKUN UNTUK MEMANTAU KUOTA:" FontSize="7.2" FontWeight="Bold" Foreground="#64748B" Margin="4,2,4,5"/>
                            <UniformGrid Name="ListAccountsPanel" Columns="2"/>
                        </StackPanel>
                    </Border>

                    <!-- Featured Prominent Quota Card for Selected Account -->
                    <Border Background="#59132036" CornerRadius="10" Padding="12,11" BorderBrush="#293B52" BorderThickness="1">
                        <StackPanel>
                            <!-- Card Header: Dot + Name + Badge (Left), Token Total (Right) -->
                            <Grid Margin="0,0,0,8">
                                <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                                    <Ellipse Name="DotFeaturedAccount" Width="7" Height="7" Fill="#10B981" Margin="0,0,6,0" VerticalAlignment="Center"/>
                                    <TextBlock Name="TxtFeaturedAccountName" Text="edvanaha" FontSize="11" FontWeight="Bold" Foreground="#F8FAFC" VerticalAlignment="Center" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" Margin="0,0,7,0"/>
                                    <Border Name="BadgeFeaturedAccountState" CornerRadius="3" Padding="5,1.5" Background="#4D0D211B" BorderBrush="#14533C" BorderThickness="1" VerticalAlignment="Center">
                                        <TextBlock Name="TxtFeaturedAccountState" Text="ACTIVE" FontSize="7.5" FontWeight="Bold" Foreground="#34D399"/>
                                    </Border>
                                </StackPanel>
                                <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" VerticalAlignment="Center">
                                    <TextBlock Text="Token: " FontSize="9" Foreground="#64748B" VerticalAlignment="Center"/>
                                    <TextBlock Name="TxtFeaturedAccountToken" Text="0 M" FontSize="11.5" FontWeight="Bold" Foreground="#38BDF8" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" VerticalAlignment="Center"/>
                                    <TextBlock Name="TxtFeaturedAccountCost" Text="" FontSize="8.5" Foreground="#34D399" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" VerticalAlignment="Center" Margin="3,0,0,0"/>
                                </StackPanel>
                            </Grid>

                            <!-- Fine Divider -->
                            <Border Height="1" Background="#263E56" Margin="0,0,0,9"/>

                            <!-- Quota Body: 2 Kolom Besar (Gemini Models Kiri, Claude and GPT Models Kanan) -->
                            <Grid>
                                <Grid.ColumnDefinitions>
                                    <ColumnDefinition Width="*"/>
                                    <ColumnDefinition Width="14"/>
                                    <ColumnDefinition Width="*"/>
                                </Grid.ColumnDefinitions>

                                <!-- Column 0: GEMINI MODELS -->
                                <StackPanel Grid.Column="0">
                                    <TextBlock Text="GEMINI MODELS" FontSize="8" FontWeight="Bold" Foreground="#64748B" Margin="0,0,0,5"/>
                                    
                                    <!-- Gemini 5-Hour Limit -->
                                    <Grid Margin="0,0,0,2">
                                        <TextBlock Text="5-Hour Limit" FontSize="9" FontWeight="SemiBold" Foreground="#CBD5E1" VerticalAlignment="Center"/>
                                        <TextBlock Name="TxtFeaturedG5Val" Text="19%" HorizontalAlignment="Right" FontSize="12.5" FontWeight="Bold" Foreground="#F59E0B" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" VerticalAlignment="Center"/>
                                    </Grid>
                                    <ProgressBar Name="ProgFeaturedG5" Value="19" Maximum="100" Height="6" Margin="0,0,0,3" Foreground="#F59E0B" Background="#331E293B" BorderThickness="0"/>
                                    <TextBlock Name="TxtFeaturedG5Reset" Text="Resets in 3h 04m 30s" FontSize="8" Foreground="#94A3B8" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif"/>

                                    <Border Height="8"/>

                                    <!-- Gemini Weekly Limit -->
                                    <Grid Margin="0,0,0,2">
                                        <TextBlock Text="Weekly Limit" FontSize="9" FontWeight="SemiBold" Foreground="#CBD5E1" VerticalAlignment="Center"/>
                                        <TextBlock Name="TxtFeaturedGWVal" Text="48%" HorizontalAlignment="Right" FontSize="12.5" FontWeight="Bold" Foreground="#10B981" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" VerticalAlignment="Center"/>
                                    </Grid>
                                    <ProgressBar Name="ProgFeaturedGW" Value="48" Maximum="100" Height="6" Margin="0,0,0,3" Foreground="#10B981" Background="#331E293B" BorderThickness="0"/>
                                    <TextBlock Name="TxtFeaturedGWReset" Text="Resets in 3d 21h 38m 06s" FontSize="8" Foreground="#94A3B8" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif"/>
                                </StackPanel>

                                <!-- Column 2: CLAUDE AND GPT MODELS -->
                                <StackPanel Grid.Column="2">
                                    <TextBlock Text="CLAUDE AND GPT MODELS" FontSize="8" FontWeight="Bold" Foreground="#64748B" Margin="0,0,0,5"/>

                                    <!-- Claude/GPT 5-Hour Limit -->
                                    <Grid Margin="0,0,0,2">
                                        <TextBlock Text="5-Hour Limit" FontSize="9" FontWeight="SemiBold" Foreground="#CBD5E1" VerticalAlignment="Center"/>
                                        <TextBlock Name="TxtFeaturedC5Val" Text="100%" HorizontalAlignment="Right" FontSize="12.5" FontWeight="Bold" Foreground="#10B981" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" VerticalAlignment="Center"/>
                                    </Grid>
                                    <ProgressBar Name="ProgFeaturedC5" Value="100" Maximum="100" Height="6" Margin="0,0,0,3" Foreground="#10B981" Background="#331E293B" BorderThickness="0"/>
                                    <TextBlock Name="TxtFeaturedC5Reset" Text="Ready" FontSize="8" Foreground="#10B981" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif"/>

                                    <Border Height="8"/>

                                    <!-- Claude/GPT Weekly Limit -->
                                    <Grid Margin="0,0,0,2">
                                        <TextBlock Text="Weekly Limit" FontSize="9" FontWeight="SemiBold" Foreground="#CBD5E1" VerticalAlignment="Center"/>
                                        <TextBlock Name="TxtFeaturedCWVal" Text="100%" HorizontalAlignment="Right" FontSize="12.5" FontWeight="Bold" Foreground="#10B981" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif" VerticalAlignment="Center"/>
                                    </Grid>
                                    <ProgressBar Name="ProgFeaturedCW" Value="100" Maximum="100" Height="6" Margin="0,0,0,3" Foreground="#10B981" Background="#331E293B" BorderThickness="0"/>
                                    <TextBlock Name="TxtFeaturedCWReset" Text="Ready" FontSize="8" Foreground="#10B981" FontFamily="Segoe UI Variable Display, Segoe UI, sans-serif"/>
                                </StackPanel>
                            </Grid>

                            <!-- Tombol Beralih Akun & Salin Prompt Resume -->
                            <Button Name="BtnSwitchAccount" Visibility="Collapsed" Margin="0,10,0,0" Padding="8,6" Background="#59064E3B" BorderBrush="#10B981" BorderThickness="1" Cursor="Hand">
                                <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
                                    <TextBlock Text="⚡" FontSize="11" Margin="0,0,6,0" VerticalAlignment="Center"/>
                                    <TextBlock Name="TxtBtnSwitchAccount" Text="BERALIH KE AKUN INI &amp; SALIN RESUME PROMPT" FontSize="8.5" FontWeight="Bold" Foreground="#34D399" VerticalAlignment="Center"/>
                                </StackPanel>
                            </Button>
                        </StackPanel>
                    </Border>
                </StackPanel>


                <!-- 5. ACTIVE TASK & CHAT MONITOR (Dengan Tombol 3-Stack Diperbesar & Daftar Dropdown) -->
                <Border Name="CardTaskMonitor" Background="#59132036" CornerRadius="10" Padding="12,10" Margin="0,0,0,0" BorderBrush="#293B52" BorderThickness="1">
                    <StackPanel>
                        <!-- Main Header Row -->
                        <Grid>
                            <Grid.ColumnDefinitions>
                                <ColumnDefinition Width="Auto" MinWidth="85"/>
                                <ColumnDefinition Width="*"/>
                                <ColumnDefinition Width="Auto" MinWidth="85"/>
                            </Grid.ColumnDefinitions>

                            <!-- Left: Status Badge -->
                            <Border Name="BadgeTaskStatus" Grid.Column="0" CornerRadius="4" Padding="7,2.5" Margin="0,0,10,0" Background="#4D0D211B" BorderBrush="#14533C" BorderThickness="1" HorizontalAlignment="Left" VerticalAlignment="Center">
                                <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                                    <Ellipse Name="DotTaskStatus" Width="5.5" Height="5.5" Fill="#10B981" Margin="0,0,5,0" VerticalAlignment="Center"/>
                                    <TextBlock Name="TxtTaskStatus" Text="IDLE" FontSize="7.5" FontWeight="Bold" Foreground="#34D399" VerticalAlignment="Center"/>
                                </StackPanel>
                            </Border>

                            <!-- Middle: Task Overview Status -->
                            <StackPanel Grid.Column="1" HorizontalAlignment="Center" VerticalAlignment="Center">
                                <TextBlock Name="LblTaskHeader" Text="AKTIFITAS TASK SAAT INI:" FontSize="7.5" FontWeight="Bold" Foreground="#64748B" HorizontalAlignment="Center" TextAlignment="Center"/>
                                <TextBlock Name="TxtActiveChatTitle" Text="Tidak ada task aktif" FontSize="9.5" FontWeight="SemiBold" Foreground="#94A3B8" FontFamily="Segoe UI" TextTrimming="CharacterEllipsis" HorizontalAlignment="Center" TextAlignment="Center"/>
                            </StackPanel>

                            <!-- Right: Tombol 3-Stack Diperbesar (Lihat Task Running) -->
                            <Button Name="BtnToggleTaskDropdown" Grid.Column="2" Visibility="Collapsed" Margin="8,0,0,0" HorizontalAlignment="Right" VerticalAlignment="Center" Padding="10,5" Background="#5916243A" BorderBrush="#2B3C54" BorderThickness="1">
                                <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
                                    <!-- 3-Stack Bars Icon (Vector) -->
                                    <Path Name="IconTaskStack" Data="M 0 1.5 L 11 1.5 M 0 5.5 L 11 5.5 M 0 9.5 L 11 9.5" Stroke="#10B981" StrokeThickness="1.6" StrokeStartLineCap="Round" StrokeEndLineCap="Round" Margin="0,0,6,0" VerticalAlignment="Center"/>
                                    <TextBlock Name="TxtTaskDropdownBtn" Text="3 Task" FontSize="9.0" FontWeight="Bold" Foreground="#A7F3D0" VerticalAlignment="Center" Margin="0,0,6,0"/>
                                    <!-- Toggle Arrow (Vector) -->
                                    <Path Name="IconTaskDropdown" Data="M 0 0 L 3.5 3.5 L 7 0" Stroke="#10B981" StrokeThickness="1.5" HorizontalAlignment="Center" VerticalAlignment="Center"/>
                                </StackPanel>
                            </Button>
                        </Grid>

                        <!-- Expandable Dropdown List Panel untuk Menampilkan Task Berjalan -->
                        <StackPanel Name="PanelTaskDropdown" ClipToBounds="True" Margin="0,9,0,0" Visibility="Collapsed">
                            <Border Height="1" Background="#263E56" Margin="0,0,0,8"/>
                            <TextBlock Text="DAFTAR TASK YANG SEDANG BERJALAN:" FontSize="7.5" FontWeight="Bold" Foreground="#64748B" Margin="0,0,0,6"/>
                            <StackPanel Name="TaskItemsListPanel"/>
                        </StackPanel>
                    </StackPanel>
                </Border>

            </StackPanel>
        </Border>
    </Grid>
</Window>
"@

$reader = (New-Object System.Xml.XmlNodeReader $xaml)
$window = [System.Windows.Markup.XamlReader]::Load($reader)



# Terapkan Ikon Transparan ke Window
try {
    if (Test-Path $script:appIconPath) {
        $iconUri = New-Object System.Uri($script:appIconPath, [System.UriKind]::Absolute)
        $window.Icon = [System.Windows.Media.Imaging.BitmapFrame]::Create($iconUri)
    } elseif (Test-Path $script:transparentIconPath) {
        $iconUri = New-Object System.Uri($script:transparentIconPath, [System.UriKind]::Absolute)
        $window.Icon = [System.Windows.Media.Imaging.BitmapFrame]::Create($iconUri)
    }
} catch {}

# Bind Elemen UI
$headerBar                 = $window.FindName("HeaderBar")
$btnPin                    = $window.FindName("BtnPin")
$txtBtnPin                 = $window.FindName("TxtBtnPin")
$btnMinimize               = $window.FindName("BtnMinimize")
$btnClose                  = $window.FindName("BtnClose")

$txtTotalAccountsCount     = $window.FindName("TxtTotalAccountsCount")
$btnAccountSelectorDropdown = $window.FindName("BtnAccountSelectorDropdown")
$dotSelectedAccountBtn      = $window.FindName("DotSelectedAccountBtn")
$txtSelectedAccountBtnLabel = $window.FindName("TxtSelectedAccountBtnLabel")
$badgeSelectedAccountBtn    = $window.FindName("BadgeSelectedAccountBtn")
$txtBadgeSelectedAccountBtn = $window.FindName("TxtBadgeSelectedAccountBtn")
$iconAccountDropdownArrow   = $window.FindName("IconAccountDropdownArrow")
$panelAccountsDropdown      = $window.FindName("PanelAccountsDropdown")
$listAccountsPanel          = $window.FindName("ListAccountsPanel")

$script:isAccountsDropdownOpen = $false

$dotFeaturedAccount        = $window.FindName("DotFeaturedAccount")
$txtFeaturedAccountName    = $window.FindName("TxtFeaturedAccountName")
$badgeFeaturedAccountState = $window.FindName("BadgeFeaturedAccountState")
$txtFeaturedAccountState   = $window.FindName("TxtFeaturedAccountState")
$txtFeaturedAccountToken   = $window.FindName("TxtFeaturedAccountToken")
$txtFeaturedAccountCost    = $window.FindName("TxtFeaturedAccountCost")

$txtFeaturedG5Val          = $window.FindName("TxtFeaturedG5Val")
$progFeaturedG5            = $window.FindName("ProgFeaturedG5")
$txtFeaturedG5Reset        = $window.FindName("TxtFeaturedG5Reset")

$txtFeaturedGWVal          = $window.FindName("TxtFeaturedGWVal")
$progFeaturedGW           = $window.FindName("ProgFeaturedGW")
$txtFeaturedGWReset        = $window.FindName("TxtFeaturedGWReset")

$txtFeaturedC5Val          = $window.FindName("TxtFeaturedC5Val")
$progFeaturedC5            = $window.FindName("ProgFeaturedC5")
$txtFeaturedC5Reset        = $window.FindName("TxtFeaturedC5Reset")

$txtFeaturedCWVal          = $window.FindName("TxtFeaturedCWVal")
$progFeaturedCW           = $window.FindName("ProgFeaturedCW")
$txtFeaturedCWReset        = $window.FindName("TxtFeaturedCWReset")

$btnSwitchAccount          = $window.FindName("BtnSwitchAccount")
$txtBtnSwitchAccount       = $window.FindName("TxtBtnSwitchAccount")

$txtActiveAccount          = $window.FindName("TxtActiveAccount")

$txtGrandTotalTokens       = $window.FindName("TxtGrandTotalTokens")
$txtGrandTotalCost         = $window.FindName("TxtGrandTotalCost")
$txtGlobalInput            = $window.FindName("TxtGlobalInput")
$txtGlobalOutput           = $window.FindName("TxtGlobalOutput")
$txtGlobalCache            = $window.FindName("TxtGlobalCache")

$badgeTaskStatus           = $window.FindName("BadgeTaskStatus")
$dotTaskStatus             = $window.FindName("DotTaskStatus")
$txtTaskStatus             = $window.FindName("TxtTaskStatus")
$lblTaskHeader             = $window.FindName("LblTaskHeader")
$txtActiveChatTitle        = $window.FindName("TxtActiveChatTitle")
$btnToggleTaskDropdown     = $window.FindName("BtnToggleTaskDropdown")
$iconTaskStack             = $window.FindName("IconTaskStack")
$txtTaskDropdownBtn        = $window.FindName("TxtTaskDropdownBtn")
$iconTaskDropdown          = $window.FindName("IconTaskDropdown")
$panelTaskDropdown         = $window.FindName("PanelTaskDropdown")
$taskItemsListPanel        = $window.FindName("TaskItemsListPanel")

# Inisialisasi LayoutTransform untuk animasi smooth accordion
if ($panelAccountsDropdown) {
    $panelAccountsDropdown.ClipToBounds = $true
    $panelAccountsDropdown.LayoutTransform = New-Object System.Windows.Media.ScaleTransform(1.0, 0.0)
}
if ($panelTaskDropdown) {
    $panelTaskDropdown.ClipToBounds = $true
    $panelTaskDropdown.LayoutTransform = New-Object System.Windows.Media.ScaleTransform(1.0, 0.0)
}

function Animate-DropdownOpen($panel) {
    if (-not $panel) { return }
    $panel.Tag = "opening"
    $scale = $panel.LayoutTransform
    if (-not ($scale -is [System.Windows.Media.ScaleTransform])) {
        $scale = New-Object System.Windows.Media.ScaleTransform(1.0, 0.0)
        $panel.LayoutTransform = $scale
    }

    $panel.Visibility = [System.Windows.Visibility]::Visible
    $currentScale = if ($scale.ScaleY -gt 0 -and $scale.ScaleY -le 1.0) { $scale.ScaleY } else { 0.0 }
    $currentOp    = if ($panel.Opacity -gt 0 -and $panel.Opacity -le 1.0) { $panel.Opacity } else { 0.0 }

    $animScale = New-Object System.Windows.Media.Animation.DoubleAnimation
    $animScale.From = $currentScale
    $animScale.To = 1.0
    $animScale.Duration = [System.Windows.Duration]::new([TimeSpan]::FromMilliseconds(220))
    $ease = New-Object System.Windows.Media.Animation.CubicEase
    $ease.EasingMode = [System.Windows.Media.Animation.EasingMode]::EaseOut
    $animScale.EasingFunction = $ease

    $animOp = New-Object System.Windows.Media.Animation.DoubleAnimation
    $animOp.From = $currentOp
    $animOp.To = 1.0
    $animOp.Duration = [System.Windows.Duration]::new([TimeSpan]::FromMilliseconds(190))

    $targetPanel = $panel
    $animScale.Add_Completed({
        if ($targetPanel.Tag -eq "opening") {
            $targetPanel.Tag = $null
        }
    })

    $scale.BeginAnimation([System.Windows.Media.ScaleTransform]::ScaleYProperty, $animScale)
    $panel.BeginAnimation([System.Windows.UIElement]::OpacityProperty, $animOp)
}

function Animate-DropdownClose($panel) {
    if (-not $panel) { return }
    $panel.Tag = "closing"
    $scale = $panel.LayoutTransform
    if (-not ($scale -is [System.Windows.Media.ScaleTransform])) {
        $scale = New-Object System.Windows.Media.ScaleTransform(1.0, 1.0)
        $panel.LayoutTransform = $scale
    }

    $currentScale = if ($scale.ScaleY -ge 0 -and $scale.ScaleY -le 1.0) { $scale.ScaleY } else { 1.0 }
    $currentOp    = if ($panel.Opacity -ge 0 -and $panel.Opacity -le 1.0) { $panel.Opacity } else { 1.0 }

    $animScale = New-Object System.Windows.Media.Animation.DoubleAnimation
    $animScale.From = $currentScale
    $animScale.To = 0.0
    $animScale.Duration = [System.Windows.Duration]::new([TimeSpan]::FromMilliseconds(180))
    $ease = New-Object System.Windows.Media.Animation.CubicEase
    $ease.EasingMode = [System.Windows.Media.Animation.EasingMode]::EaseIn
    $animScale.EasingFunction = $ease

    $animOp = New-Object System.Windows.Media.Animation.DoubleAnimation
    $animOp.From = $currentOp
    $animOp.To = 0.0
    $animOp.Duration = [System.Windows.Duration]::new([TimeSpan]::FromMilliseconds(150))

    $targetPanel = $panel
    $animScale.Add_Completed({
        if ($targetPanel.Tag -eq "closing") {
            $targetPanel.Visibility = [System.Windows.Visibility]::Collapsed
            $targetPanel.Tag = $null
        }
    })

    $scale.BeginAnimation([System.Windows.Media.ScaleTransform]::ScaleYProperty, $animScale)
    $panel.BeginAnimation([System.Windows.UIElement]::OpacityProperty, $animOp)
}

$script:isTaskDropdownOpen = $false
$script:lastTaskCount      = 0

if ($btnToggleTaskDropdown) {
    $btnToggleTaskDropdown.Add_Click({
        $script:isTaskDropdownOpen = -not $script:isTaskDropdownOpen
        if ($script:isTaskDropdownOpen) {
            Update-TaskMonitorDisplay
            Animate-DropdownOpen $panelTaskDropdown
        } else {
            $txtTaskDropdownBtn.Text = "$($script:lastTaskCount) Task"
            if ($iconTaskDropdown) { $iconTaskDropdown.Data = [System.Windows.Media.Geometry]::Parse("M 0 0 L 3.5 3.5 L 7 0") }
            Animate-DropdownClose $panelTaskDropdown
        }
    })
}

if ($btnAccountSelectorDropdown) {
    $btnAccountSelectorDropdown.Add_Click({
        $script:isAccountsDropdownOpen = -not $script:isAccountsDropdownOpen
        if ($script:isAccountsDropdownOpen) {
            Update-WidgetView
            Animate-DropdownOpen $panelAccountsDropdown
        } else {
            if ($iconAccountDropdownArrow) { $iconAccountDropdownArrow.Data = [System.Windows.Media.Geometry]::Parse("M 0 0 L 3.5 3.5 L 7 0") }
            Animate-DropdownClose $panelAccountsDropdown
        }
    })
}

if ($btnSwitchAccount) {
    $btnSwitchAccount.Add_Click({
        $target = $script:selectedProfile
        $active = $script:currentActiveUser

        # 1. Cek apakah ada task yang sedang RUNNING
        $isRunning = ($script:cachedTaskInfo -and $script:cachedTaskInfo.status -eq "RUNNING")
        if ($isRunning) {
            $confirm = [System.Windows.MessageBox]::Show(
                "Task saat ini sedang RUNNING (sedang berpikir/menulis kode).`n`nDisarankan menunggu hingga task IDLE agar file proyek tidak korup.`n`nTetap beralih akun sekarang?",
                "Peringatan: Task Sedang Berjalan",
                [System.Windows.MessageBoxButton]::YesNo,
                [System.Windows.MessageBoxImage]::Warning
            )
            if ($confirm -ne [System.Windows.MessageBoxResult]::Yes) { return }
        }

        # 2. Siapkan instruksi resume & salin ke Clipboard
        $instruction = "Lanjutkan pengerjaan task sebelumnya dari bagian yang belum selesai. Periksa kondisi file terakhir di proyek dan tuntaskan seluruh implementasinya."
        Set-Content -Path "D:\ProjekAntigravity\LAST_RESUME_PROMPT.txt" -Value $instruction -Force -Encoding UTF8
        try {
            [System.Windows.Clipboard]::SetText($instruction)
        } catch {
            try { Set-Clipboard -Value $instruction } catch {
                try { cmd.exe /c "type D:\ProjekAntigravity\LAST_RESUME_PROMPT.txt | clip" } catch {}
            }
        }

        # 3. Tentukan argumen target
        $targetArg = if ($target -and $target -ne $active) { "-TargetAccount `"$target`"" } else { "" }
        $switchScript = "D:\ProjekAntigravity\Switch-AntigravityAccount.ps1"

        if ($txtBtnSwitchAccount) { $txtBtnSwitchAccount.Text = "MEMPROSES PERALIHAN AKUN..." }
        $btnSwitchAccount.IsEnabled = $false

        # 4. Jalankan script switcher secara terpisah via WMI (kebal dari penutupan Antigravity)
        $wmiArg = "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$switchScript`" $targetArg"
        Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList $wmiArg | Out-Null

        # 5. Tampilkan notifikasi balon tray
        if ($script:notifyIcon) {
            $dispTarget = if ($target -and $target -ne $active) { $target } else { "Akun Cadangan" }
            $script:notifyIcon.ShowBalloonTip(5000, "Antigravity Switcher", "Beralih ke $dispTarget! Prompt resume otomatis dikirimkan ke Antigravity.", [System.Windows.Forms.ToolTipIcon]::Info)
        }

        # 6. Pulihkan tombol setelah beberapa detik dan sinkronisasi
        $t = New-Object System.Windows.Threading.DispatcherTimer
        $t.Interval = [TimeSpan]::FromSeconds(6)
        $t.Add_Tick({
            $this.Stop()
            if ($btnSwitchAccount) { $btnSwitchAccount.IsEnabled = $true }
            Sync-LiveAccountData
            Update-WidgetView
        })
        $t.Start()
    })
}

$brushConv = [System.Windows.Media.BrushConverter]::new()
function Get-Brush($hex) { return $brushConv.ConvertFromString($hex) }

function Format-CompactNumber([int64]$val, [string]$zeroText = "0") {
    if ($val -ge 1000000000) { return "$([math]::Round($val / 1000000000.0, 2)) B" }
    if ($val -ge 1000000)    { return "$([math]::Round($val / 1000000.0, 2)) M" }
    if ($val -ge 1000)       { return "$([math]::Round($val / 1000.0, 1)) K" }
    if ($val -gt 0)          { return "$val" }
    return $zeroText
}

function Format-EstimatedCost([int64]$inTok, [int64]$outTok, [int64]$cacheTok = 0, [int64]$totalTok = 0) {
    if ($inTok -eq 0 -and $outTok -eq 0 -and $totalTok -gt 0) {
        $inTok  = [int64]($totalTok * 0.85)
        $outTok = [int64]($totalTok * 0.15)
    }
    # Benchmark harga pasar API pengembang (Gemini 1.5/2.5 Pro):
    # Input: $1.25 / 1M, Output: $5.00 / 1M, Cache: $0.30 / 1M, Kurs: 1 USD = Rp 16.000
    $usd = [double](($inTok / 1000000.0 * 1.25) + ($outTok / 1000000.0 * 5.00) + ($cacheTok / 1000000.0 * 0.30))
    $idr = $usd * 16000.0

    $idrFormatted = if ($idr -ge 1000000000) {
        "$([math]::Round($idr / 1000000000.0, 2)) Miliar"
    } elseif ($idr -ge 1000000) {
        "$([math]::Round($idr / 1000000.0, 1)) Jt"
    } elseif ($idr -ge 1000) {
        "$([math]::Round($idr / 1000.0, 0)) Rb"
    } else {
        "$([math]::Round($idr, 0))"
    }

    $usdFormatted = if ($usd -ge 1000) {
        [math]::Round($usd, 0).ToString('N0')
    } elseif ($usd -ge 1) {
        [math]::Round($usd, 2).ToString('F2')
    } elseif ($usd -gt 0) {
        [math]::Round($usd, 3).ToString()
    } else {
        "0.00"
    }

    return [PSCustomObject]@{
        Full  = '~$' + $usdFormatted + ' (Rp ' + $idrFormatted + ')'
        Short = '~$' + $usdFormatted
    }
}

function Set-PinState([bool]$pinned) {
    $script:isPinned = $pinned
    $window.Topmost = $script:isPinned
    try {
        $hwnd = (New-Object System.Windows.Interop.WindowInteropHelper($window)).Handle
        if ($hwnd -ne [IntPtr]::Zero) {
            if ($script:isPinned) {
                # Pinned: Selalu tampil di depan aplikasi lain
                [Win32.WinAPI]::SetWindowPos($hwnd, [IntPtr](-1), 0, 0, 0, 0, 0x0002 -bor 0x0001)
                [Win32.WinAPI]::SetForegroundWindow($hwnd) | Out-Null
            } else {
                # Unpinned: Hanya berada di desktop layer di belakang aplikasi lain
                [Win32.WinAPI]::SetWindowPos($hwnd, [IntPtr](-2), 0, 0, 0, 0, 0x0002 -bor 0x0001 -bor 0x0010)
                [Win32.WinAPI]::SetWindowPos($hwnd, [IntPtr](1), 0, 0, 0, 0, 0x0002 -bor 0x0001 -bor 0x0010)
            }
        }
    } catch {}

    if ($script:isPinned) {
        if ($txtBtnPin) { 
            $txtBtnPin.Foreground = Get-Brush "#34D399"
            $txtBtnPin.Text = "PIN"
        }
        if ($btnPin) {
            $btnPin.Background = Get-Brush "#4D0D211B"
            $btnPin.BorderBrush = Get-Brush "#14533C"
            $btnPin.ToolTip = "Widget aktif di atas aplikasi lain (PINNED). Klik untuk kembalikan ke desktop"
        }
        if ($script:trayItemPin) {
            $script:trayItemPin.Text = "[PIN] Lepas Pin (Kembali ke Mode Desktop)"
            $script:trayItemPin.Checked = $true
        }
    } else {
        if ($txtBtnPin) { 
            $txtBtnPin.Foreground = Get-Brush "#94A3B8"
            $txtBtnPin.Text = "PIN"
        }
        if ($btnPin) {
            $btnPin.Background = Get-Brush "#5916243A"
            $btnPin.BorderBrush = Get-Brush "#2B3C54"
            $btnPin.ToolTip = "Klik untuk menampilkan widget selalu di atas aplikasi lain (PIN)"
        }
        if ($script:trayItemPin) {
            $script:trayItemPin.Text = "[PIN] Pin Selalu di Atas (Always on Top)"
            $script:trayItemPin.Checked = $false
        }
    }
}

function Toggle-PinState {
    Set-PinState (-not $script:isPinned)
}

function Hide-ToTray { $window.Hide() }
function Show-FromTray {
    $window.Show()
    $window.WindowState = [System.Windows.WindowState]::Normal
    $window.Activate() | Out-Null
    try {
        $helper = New-Object System.Windows.Interop.WindowInteropHelper($window)
        if ($helper.Handle -ne [IntPtr]::Zero) {
            if ($script:isPinned) {
                [Win32.WinAPI]::SetWindowPos($helper.Handle, [IntPtr](-1), 0, 0, 0, 0, 0x0002 -bor 0x0001)
            } else {
                # Panggil ke layer paling depan agar langsung terlihat meskipun sedang berada di dalam aplikasi
                [Win32.WinAPI]::SetWindowPos($helper.Handle, [IntPtr](0), 0, 0, 0, 0, 0x0002 -bor 0x0001)
            }
            [Win32.WinAPI]::SetForegroundWindow($helper.Handle) | Out-Null
        }
    } catch {}
}
function Toggle-WidgetVisibility {
    if ($window.IsVisible) {
        try {
            $helper = New-Object System.Windows.Interop.WindowInteropHelper($window)
            $fg = [Win32.WinAPI]::GetForegroundWindow()
            if ($fg -eq $helper.Handle) {
                Hide-ToTray
            } else {
                Show-FromTray
            }
        } catch {
            Hide-ToTray
        }
    } else {
        Show-FromTray
    }
}

function Exit-WidgetApp {
    if ($script:trayAnimTimer) { $script:trayAnimTimer.Stop() }
    if ($script:countdownTimer) { $script:countdownTimer.Stop() }
    if ($script:syncTimer) { $script:syncTimer.Stop() }
    if ($script:notifyIcon) {
        $script:notifyIcon.Visible = $false
        $script:notifyIcon.Dispose()
    }
    if ($script:app) { $script:app.Shutdown() }
    $window.Close()
    [System.Environment]::Exit(0)
}

# System Tray Initialization
$script:notifyIcon = [System.Windows.Forms.NotifyIcon]::new()
$script:notifyIcon.Text = "Antigravity Monitor"
if (Test-Path $script:appIconPath) {
    $script:notifyIcon.Icon = [System.Drawing.Icon]::new($script:appIconPath)
}
$script:notifyIcon.Visible = $true

$trayMenu = [System.Windows.Forms.ContextMenuStrip]::new()
$trayItemSummon = $trayMenu.Items.Add("Panggil Widget ke Depan")
$trayItemSummon.Font = [System.Drawing.Font]::new($trayMenu.Font, [System.Drawing.FontStyle]::Bold)
$trayItemSummon.Add_Click({ Show-FromTray })

$script:trayItemPin = $trayMenu.Items.Add("[PIN] Pin Selalu di Atas (Always on Top)")
$script:trayItemPin.Add_Click({ Toggle-PinState })

$trayItemToggle = $trayMenu.Items.Add("Sembunyikan ke Tray")
$trayItemToggle.Add_Click({ Hide-ToTray })

$trayMenu.Items.Add("-") | Out-Null
$trayItemRefresh = $trayMenu.Items.Add("Perbarui Sekarang")
$trayItemRefresh.Add_Click({
    $script:transcriptCache.Clear()
    $script:lsCsrf = $null
    $script:lsPort = $null
    $script:lsPid = $null
    $script:lastTokenScan = [DateTime]::MinValue
    Sync-LiveAccountData
})
$trayItemSwitch = $trayMenu.Items.Add("Beralih Akun & Salin Resume Prompt")
$trayItemSwitch.Add_Click({
    if ($btnSwitchAccount) {
        $btnSwitchAccount.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
    }
})
$trayMenu.Items.Add("-") | Out-Null
$trayItemExit = $trayMenu.Items.Add("Tutup Widget")
$trayItemExit.Add_Click({ Exit-WidgetApp })
$script:notifyIcon.ContextMenuStrip = $trayMenu

$script:notifyIcon.Add_Click({
    if ($_.Button -eq [System.Windows.Forms.MouseButtons]::Left) { Toggle-WidgetVisibility }
})

$window.Add_Closing({ Exit-WidgetApp })

# Posisi Kanan Atas Layar
$screenWidth = [System.Windows.SystemParameters]::PrimaryScreenWidth
$window.Left = $screenWidth - 410
$window.Top  = 35

$headerBar.Add_MouseLeftButtonDown({ $window.DragMove() })
$btnMinimize.Add_Click({ Hide-ToTray })
$btnClose.Add_Click({ Exit-WidgetApp })

$btnPin.Add_Click({ Toggle-PinState })

# Saat fokus berpindah ke aplikasi lain dan widget tidak di-PIN, pastikan widget tetap di layer desktop (belakang aplikasi)
$window.Add_Deactivated({
    if (-not $script:isPinned) {
        try {
            $hwnd = (New-Object System.Windows.Interop.WindowInteropHelper($window)).Handle
            if ($hwnd -ne [IntPtr]::Zero) {
                [Win32.WinAPI]::SetWindowPos($hwnd, [IntPtr]1, 0, 0, 0, 0, 0x0002 -bor 0x0001 -bor 0x0010)
            }
        } catch {}
    }
})

function Save-AccountsRegistry($dict) {
    if (-not $dict -or $dict.Count -eq 0) { return }
    try {
        $json = $dict | ConvertTo-Json -Depth 6
        [System.IO.File]::WriteAllText($script:registryFile, $json, [System.Text.Encoding]::UTF8)
    } catch {}
}

function Format-ResetTime($isoTime) {
    if ([string]::IsNullOrWhiteSpace($isoTime)) { return "Fresh Quota" }
    try {
        $target = [DateTime]::Parse($isoTime).ToUniversalTime()
        $diff = $target - [DateTime]::UtcNow
        if ($diff.TotalSeconds -le 0) { return "Ready / Full" }
        if ($diff.Days -gt 0) {
            return ('Resets in {0}d {1}h {2:D2}m {3:D2}s' -f $diff.Days, $diff.Hours, $diff.Minutes, $diff.Seconds)
        }
        if ($diff.Hours -gt 0) {
            return ('Resets in {0}h {1:D2}m {2:D2}s' -f $diff.Hours, $diff.Minutes, $diff.Seconds)
        }
        if ($diff.Minutes -gt 0) {
            return ('Resets in {0}m {1:D2}s' -f $diff.Minutes, $diff.Seconds)
        }
        return ('Resets in {0}s' -f $diff.Seconds)
    } catch { return "Resets soon" }
}

function Ensure-QuotaProperties($q) {
    if (-not $q) { return }
    $props = @(
        'geminiWeekly', 'geminiWeeklyReset', 'geminiWeeklyResetIso',
        'gemini5h', 'gemini5hReset', 'gemini5hResetIso',
        'claudeWeekly', 'claudeWeeklyResetIso',
        'claude5h', 'claude5hResetIso'
    )
    foreach ($p in $props) {
        if (-not $q.PSObject.Properties[$p]) {
            $q | Add-Member -NotePropertyName $p -NotePropertyValue $null -Force
        }
    }
}

function Reconcile-AccountQuotaExpiry($acc) {
    if (-not $acc -or -not $acc.quota) { return $false }
    $q = $acc.quota
    Ensure-QuotaProperties $q

    $now = [DateTime]::UtcNow
    $changed = $false

    # 1. 5-Hour Countdown Check
    if (-not [string]::IsNullOrWhiteSpace($q.gemini5hResetIso)) {
        try {
            $t5 = [DateTime]::Parse($q.gemini5hResetIso).ToUniversalTime()
            $diff5 = $t5 - $now
            if ($diff5.TotalSeconds -le 0) {
                $q.gemini5h = 100
                $q.gemini5hReset = "Ready / Full"
                $q.gemini5hResetIso = $null
                $changed = $true
            } else {
                $q.gemini5hReset = Format-ResetTime $q.gemini5hResetIso
            }
        } catch { $q.gemini5hResetIso = $null }
    } elseif (-not [string]::IsNullOrWhiteSpace($acc.lastSeen)) {
        try {
            $ls = [DateTime]::Parse($acc.lastSeen).ToUniversalTime()
            $hoursPassed = ($now - $ls).TotalHours
            if ($hoursPassed -ge 5.0) {
                if ($q.gemini5h -lt 100 -or $q.gemini5hReset -ne "Ready / Full") {
                    $q.gemini5h = 100
                    $q.gemini5hReset = "Ready / Full"
                    $q.gemini5hResetIso = $null
                    $changed = $true
                }
            } elseif ($q.gemini5hReset -match 'Resets in\s+(\d+)h\s*(\d*)m') {
                $hrs = [int]$matches[1]
                $mins = if ($matches[2]) { [int]$matches[2] } else { 0 }
                $target = $ls.AddHours($hrs).AddMinutes($mins)
                if (($target - $now).TotalSeconds -le 0) {
                    $q.gemini5h = 100
                    $q.gemini5hReset = "Ready / Full"
                    $q.gemini5hResetIso = $null
                    $changed = $true
                } else {
                    $q.gemini5hResetIso = $target.ToString("o")
                    $q.gemini5hReset = Format-ResetTime $q.gemini5hResetIso
                    $changed = $true
                }
            }
            if ($hoursPassed -ge 168.0) {
                if ($q.geminiWeekly -lt 100 -or $q.geminiWeeklyReset -ne "Ready / Full") {
                    $q.geminiWeekly = 100
                    $q.geminiWeeklyReset = "Ready / Full"
                    $q.geminiWeeklyResetIso = $null
                    $changed = $true
                }
            } elseif ($q.geminiWeeklyReset -match 'Resets in\s+(\d+)d\s*(\d*)h') {
                $days = [int]$matches[1]
                $hrs = if ($matches[2]) { [int]$matches[2] } else { 0 }
                $targetW = $ls.AddDays($days).AddHours($hrs)
                if (($targetW - $now).TotalSeconds -le 0) {
                    $q.geminiWeekly = 100
                    $q.geminiWeeklyReset = "Ready / Full"
                    $q.geminiWeeklyResetIso = $null
                    $changed = $true
                } else {
                    $q.geminiWeeklyResetIso = $targetW.ToString("o")
                    $q.geminiWeeklyReset = Format-ResetTime $q.geminiWeeklyResetIso
                    $changed = $true
                }
            }
        } catch {}
    }

    # 2. Weekly Countdown Check
    if (-not [string]::IsNullOrWhiteSpace($q.geminiWeeklyResetIso)) {
        try {
            $tw = [DateTime]::Parse($q.geminiWeeklyResetIso).ToUniversalTime()
            $diffw = $tw - $now
            if ($diffw.TotalSeconds -le 0) {
                $q.geminiWeekly = 100
                $q.geminiWeeklyReset = "Ready / Full"
                $q.geminiWeeklyResetIso = $null
                $changed = $true
            } else {
                $q.geminiWeeklyReset = Format-ResetTime $q.geminiWeeklyResetIso
            }
        } catch { $q.geminiWeeklyResetIso = $null }
    }

    # 3. Claude 5h & Weekly Expiry Checks
    if (-not [string]::IsNullOrWhiteSpace($q.claude5hResetIso)) {
        try {
            $tcf = [DateTime]::Parse($q.claude5hResetIso).ToUniversalTime()
            if (($tcf - $now).TotalSeconds -le 0) {
                $q.claude5h = 100
                $q.claude5hResetIso = $null
                $changed = $true
            }
        } catch { $q.claude5hResetIso = $null }
    }
    if (-not [string]::IsNullOrWhiteSpace($q.claudeWeeklyResetIso)) {
        try {
            $tcw = [DateTime]::Parse($q.claudeWeeklyResetIso).ToUniversalTime()
            if (($tcw - $now).TotalSeconds -le 0) {
                $q.claudeWeekly = 100
                $q.claudeWeeklyResetIso = $null
                $changed = $true
            }
        } catch { $q.claudeWeeklyResetIso = $null }
    }

    return $changed
}

function Get-AccountsRegistry {
    if (Test-Path $script:registryFile) {
        for ($i = 0; $i -lt 5; $i++) {
            try {
                $raw = Get-Content $script:registryFile -Raw -Encoding UTF8 -ErrorAction Stop | ConvertFrom-Json
                $dict = [ordered]@{}
                $anyReconciled = $false
                foreach ($prop in $raw.PSObject.Properties) {
                    $item = $prop.Value
                    if ($item -and $item.quota) {
                        Ensure-QuotaProperties $item.quota
                        if (Reconcile-AccountQuotaExpiry $item) {
                            $anyReconciled = $true
                        }
                    }
                    $dict[$prop.Name] = $item
                }
                if ($dict.Count -gt 0) {
                    if ($anyReconciled) {
                        Save-AccountsRegistry $dict
                    }
                    return $dict
                }
            } catch {
                Start-Sleep -Milliseconds 50
            }
        }
    }
    if ($script:currentRegistry -and $script:currentRegistry.Count -gt 0) {
        return $script:currentRegistry
    }
    return [ordered]@{}
}

function Get-LanguageServerConnection {
    # 1. Fast path: reuse cached connection if verified within last 30 seconds
    if ($script:lsCsrf -and $script:lsPort -and $script:lsPid -and ((Get-Date) - $script:lastLsCheck).TotalSeconds -lt 30) {
        return @{ Csrf = $script:lsCsrf; Port = $script:lsPort }
    }
    try {
        # 2. Check if existing cached port and PID are still alive & responding
        if ($script:lsCsrf -and $script:lsPort -and $script:lsPid) {
            $pAlive = Get-Process -Id $script:lsPid -ErrorAction SilentlyContinue
            if ($pAlive -and $pAlive.ProcessName -like "*language_server*") {
                try {
                    $headers = @{ "x-codeium-csrf-token" = $script:lsCsrf; "Content-Type" = "application/json" }
                    $null = Invoke-RestMethod -Uri "https://127.0.0.1:$($script:lsPort)/exa.language_server_pb.LanguageServerService/GetUserStatus" -Method Post -Headers $headers -Body "{}" -TimeoutSec 1
                    $script:lastLsCheck = Get-Date
                    return @{ Csrf = $script:lsCsrf; Port = $script:lsPort }
                } catch {}
            }
        }

        # 3. Otherwise rediscover language_server process
        $lsProc = Get-CimInstance Win32_Process -Filter "Name = 'language_server.exe'" | Where-Object { $_.CommandLine -like "*--csrf_token*" } | Select-Object -First 1
        if (-not $lsProc -or -not ($lsProc.CommandLine -match '--csrf_token\s+([a-f0-9\-]+)')) { return $null }
        $csrf = $matches[1]
        $pidNum = $lsProc.ProcessId

        # 4. Ultra-fast netstat port scan instead of slow Get-NetTCPConnection
        $listeningPorts = @()
        if ($script:lsPort) { $listeningPorts += $script:lsPort }
        $netstatOut = netstat -ano -p tcp
        foreach ($line in $netstatOut) {
            if ($line -match "127\.0\.0\.1:(\d+)\s+.*LISTENING\s+$pidNum") {
                $p = [int]$matches[1]
                if ($listeningPorts -notcontains $p) { $listeningPorts += $p }
            }
        }

        foreach ($p in $listeningPorts) {
            try {
                $headers = @{ "x-codeium-csrf-token" = $csrf; "Content-Type" = "application/json" }
                $null = Invoke-RestMethod -Uri "https://127.0.0.1:${p}/exa.language_server_pb.LanguageServerService/GetUserStatus" -Method Post -Headers $headers -Body "{}" -TimeoutSec 1
                $script:lsCsrf = $csrf
                $script:lsPort = $p
                $script:lsPid = $pidNum
                $script:lastLsCheck = Get-Date
                return @{ Csrf = $csrf; Port = $p }
            } catch {}
        }
    } catch {}
    return $null
}

function Get-TranscriptStatsById([string]$id) {
    if (-not $id) { return $null }
    $transcript = [System.IO.Path]::Combine($script:brainPath, "$id\.system_generated\logs\transcript.jsonl")
    if (-not [System.IO.File]::Exists($transcript)) { return $null }
    try {
        $fi = New-Object System.IO.FileInfo($transcript)
        $cached = $script:transcriptCache[$id]
        if ($cached -and $cached.LastWriteTime -eq $fi.LastWriteTimeUtc -and $cached.Length -eq $fi.Length) {
            return $cached
        }
        $in = [int64]0; $out = [int64]0; $c = [int64]0
        $lines = [System.IO.File]::ReadLines($transcript)
        foreach ($line in $lines) {
            if ($line -match '"input_tokens":(\d+)')      { $in  += [int64]$matches[1] }
            if ($line -match '"output_tokens":(\d+)')     { $out += [int64]$matches[1] }
            if ($line -match '"cache_read_tokens":(\d+)') { $c   += [int64]$matches[1] }
        }
        $stats = [PSCustomObject]@{ LastWriteTime = $fi.LastWriteTimeUtc; Length = $fi.Length; In = $in; Out = $out; Cache = $c }
        $script:transcriptCache[$id] = $stats
        return $stats
    } catch {
        return $null
    }
}

function Get-ActiveAccountTokens([string]$user = "", [switch]$Force) {
    if (-not $Force -and $script:cachedActiveTokens -and ($script:cachedActiveTokensUser -eq $user) -and $script:lastTokenScan -and ((Get-Date) - $script:lastTokenScan).TotalMinutes -lt 2) {
        return $script:cachedActiveTokens
    }

    $inTokens = [int64]0; $outTokens = [int64]0; $cacheTokens = [int64]0; $activeConvCount = 0
    $allConvIds = New-Object System.Collections.Generic.HashSet[string]

    # 1. Kumpulkan conversation IDs dari app_storage.json utama
    $storage = "C:\Users\edvan\AppData\Roaming\Antigravity\app_storage.json"
    if (Test-Path $storage) {
        try {
            $json = [System.IO.File]::ReadAllText($storage) | ConvertFrom-Json
            $json.PSObject.Properties | 
                Where-Object { $_.Name -like "antigravity-multi-conversation-layout-v3-*" -and $_.Name -notlike "*index*" } | 
                ForEach-Object { 
                    $cid = $_.Name.Replace("antigravity-multi-conversation-layout-v3-", "").Trim()
                    if ($cid) { [void]$allConvIds.Add($cid) }
                }
        } catch {}
    }

    # 2. Kumpulkan conversation IDs dari folder profil akun jika ada
    $profilesPath = "C:\Users\edvan\AppData\Roaming\Antigravity\Profiles"
    if ($user -and (Test-Path $profilesPath)) {
        try {
            $pDirs = Get-ChildItem -Path $profilesPath -Directory | Where-Object { $_.Name -like "*$user*" }
            foreach ($pDir in $pDirs) {
                $pStorage = Join-Path $pDir.FullName "app_storage.json"
                if (Test-Path $pStorage) {
                    $pJson = [System.IO.File]::ReadAllText($pStorage) | ConvertFrom-Json
                    $pJson.PSObject.Properties | 
                        Where-Object { $_.Name -like "antigravity-multi-conversation-layout-v3-*" -and $_.Name -notlike "*index*" } | 
                        ForEach-Object { 
                            $cid = $_.Name.Replace("antigravity-multi-conversation-layout-v3-", "").Trim()
                            if ($cid) { [void]$allConvIds.Add($cid) }
                        }
                }
            }
        } catch {}
    }

    # 3. Kumpulkan conversation IDs yang tersimpan di registry untuk akun ini & ambil convBaseline
    $baselineMap = $null
    if (-not $script:currentRegistry) { $script:currentRegistry = Get-AccountsRegistry }
    if ($user -and $script:currentRegistry -and $script:currentRegistry.Contains($user)) {
        $savedIds = $script:currentRegistry[$user].knownConvIds
        if ($savedIds) {
            foreach ($sid in $savedIds) {
                if ($sid) { [void]$allConvIds.Add($sid) }
            }
        }
        if ($script:currentRegistry[$user].PSObject.Properties["convBaseline"]) {
            $baselineMap = $script:currentRegistry[$user].convBaseline
        }
    }

    $participatingConvIds = New-Object System.Collections.Generic.List[string]

    foreach ($id in $allConvIds) {
        $stats = Get-TranscriptStatsById $id
        if ($stats) {
            $in = [int64]$stats.In
            $out = [int64]$stats.Out
            $cache = [int64]$stats.Cache

            # Baseline offset untuk percakapan yang diwarisi dari akun sebelumnya
            $baseIn = [int64]0; $baseOut = [int64]0; $baseCache = [int64]0
            if ($baselineMap -and $baselineMap.PSObject.Properties[$id]) {
                $baseEntry = $baselineMap.$id
                if ($baseEntry) {
                    if ($baseEntry.In)    { $baseIn    = [int64]$baseEntry.In }
                    if ($baseEntry.Out)   { $baseOut   = [int64]$baseEntry.Out }
                    if ($baseEntry.Cache) { $baseCache = [int64]$baseEntry.Cache }
                }
            }

            $netIn    = [Math]::Max([int64]0, [int64]($in - $baseIn))
            $netOut   = [Math]::Max([int64]0, [int64]($out - $baseOut))
            $netCache = [Math]::Max([int64]0, [int64]($cache - $baseCache))

            # Hitung jika ada pertambahan token delta atau jika percakapan baru untuk akun ini
            if (($netIn + $netOut) -gt 0) {
                $inTokens += $netIn
                $outTokens += $netOut
                $cacheTokens += $netCache
                $activeConvCount++
                $participatingConvIds.Add($id)
            }
        }
    }

    $res = [PSCustomObject]@{
        Conversations = $activeConvCount
        Input         = $inTokens
        Output        = $outTokens
        Cache         = $cacheTokens
        Total         = ($inTokens + $outTokens)
        ConvIds       = @($participatingConvIds)
    }
    if ($res.Total -gt 0) {
        $script:cachedActiveTokens = $res
        $script:cachedActiveTokensUser = $user
        $script:lastTokenScan = Get-Date
    }
    return $res
}

function Get-GlobalTranscriptTotals([switch]$Force) {
    if (-not $Force -and $script:cachedGlobalTotals -and $script:lastGlobalScan -and ((Get-Date) - $script:lastGlobalScan).TotalMinutes -lt 1) {
        return $script:cachedGlobalTotals
    }

    $in = [int64]0; $out = [int64]0; $c = [int64]0
    if (Test-Path $script:brainPath) {
        try {
            $dirs = [System.IO.Directory]::GetDirectories($script:brainPath)
            foreach ($d in $dirs) {
                $cid = [System.IO.Path]::GetFileName($d)
                if ($cid -and -not $cid.StartsWith(".")) {
                    $stats = Get-TranscriptStatsById $cid
                    if ($stats) {
                        $in  += [int64]$stats.In
                        $out += [int64]$stats.Out
                        $c   += [int64]$stats.Cache
                    }
                }
            }
        } catch {}
    }

    $res = [PSCustomObject]@{
        Input  = $in
        Output = $out
        Cache  = $c
        Total  = ($in + $out)
    }
    if ($res.Total -gt 0) {
        $script:cachedGlobalTotals = $res
        $script:lastGlobalScan = Get-Date
    }
    return $res
}

function Get-RealtimeQuota {
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
    try {
        $conn = Get-LanguageServerConnection
        if (-not $conn) { return $null }
        $headers = @{ "x-codeium-csrf-token" = $conn.Csrf; "Content-Type" = "application/json" }
        $res = Invoke-RestMethod -Uri "https://127.0.0.1:$($conn.Port)/exa.language_server_pb.LanguageServerService/RetrieveUserQuotaSummary" -Method Post -Headers $headers -Body '{"forceRefresh":true}' -TimeoutSec 3
        return $res.response
    } catch {
        $script:lsCsrf = $null; $script:lsPort = $null; $script:lsPid = $null
        return $null
    }
}

function Get-LiveActiveUserEmail {
    try {
        $conn = Get-LanguageServerConnection
        if (-not $conn) { return $null }
        $headers = @{ "x-codeium-csrf-token" = $conn.Csrf; "Content-Type" = "application/json" }
        $res = Invoke-RestMethod -Uri "https://127.0.0.1:$($conn.Port)/exa.language_server_pb.LanguageServerService/GetUserStatus" -Method Post -Headers $headers -Body "{}" -TimeoutSec 2
        if ($res.userStatus -and $res.userStatus.email) { return $res.userStatus.email }
    } catch {}
    return $null
}

function Format-CleanUsername($emailOrName) {
    if ([string]::IsNullOrWhiteSpace($emailOrName)) { return "Unknown" }
    return ($emailOrName -replace '@gmail\.com$', '') -replace '@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', ''
}

function Get-AntigravityActiveTask {
    # 1. Non-blocking check for background python task worker
    if ($script:taskProcess -ne $null) {
        if ($script:taskProcess.HasExited) {
            try {
                $raw = $script:taskProcess.StandardOutput.ReadToEnd()
                if (-not [string]::IsNullOrWhiteSpace($raw)) {
                    $parsed = $raw | ConvertFrom-Json
                    if ($parsed) {
                        $parsedChats = @()
                        if ($parsed.chats) {
                            if ($parsed.chats -is [System.Collections.IEnumerable] -and $parsed.chats -isnot [string]) {
                                foreach ($c in $parsed.chats) { $parsedChats += [string]$c }
                            } else {
                                $parsedChats += [string]$parsed.chats
                            }
                        }
                        $script:cachedTaskInfo = [PSCustomObject]@{
                            status = [string]$parsed.status
                            chats  = $parsedChats
                        }
                    }
                }
            } catch {}
            finally {
                $script:taskProcess.Dispose()
                $script:taskProcess = $null
            }
        } elseif (((Get-Date) - $script:taskProcessStart).TotalSeconds -gt 6) {
            try { $script:taskProcess.Kill() } catch {}
            $script:taskProcess.Dispose()
            $script:taskProcess = $null
        }
    }

    # 2. Trigger asynchronous background task poll secara realtime (setiap 1.5 detik) tanpa menahan UI thread
    if ($script:taskProcess -eq $null -and ((Get-Date) - $script:lastTaskPollTime).TotalSeconds -ge 1.5) {
        $helper = "D:\ProjekAntigravity\get-active-task.py"
        if (Test-Path $helper) {
            try {
                $psi = New-Object System.Diagnostics.ProcessStartInfo
                $psi.FileName = "python"
                $psi.Arguments = "`"$helper`""
                $psi.CreateNoWindow = $true
                $psi.UseShellExecute = $false
                $psi.RedirectStandardOutput = $true
                $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
                $script:taskProcess = [System.Diagnostics.Process]::Start($psi)
                $script:taskProcessStart = Get-Date
                $script:lastTaskPollTime = Get-Date
            } catch {}
        }
    }

    return $script:cachedTaskInfo
}

# Helper untuk mengeset tooltip System Tray (Mendukung hingga 126 karakter tanpa batasan 63 char bawaan WinForms)
function Set-NotifyIconText([System.Windows.Forms.NotifyIcon]$icon, [string]$text) {
    if (-not $icon) { return }
    try {
        if ($text.Length -gt 126) { $text = $text.Substring(0, 126) }
        $field = [System.Windows.Forms.NotifyIcon].GetField('text', [System.Reflection.BindingFlags]'NonPublic,Instance')
        $method = [System.Windows.Forms.NotifyIcon].GetMethod('UpdateIcon', [System.Reflection.BindingFlags]'NonPublic,Instance')
        if ($field -and $method) {
            $field.SetValue($icon, $text)
            $method.Invoke($icon, @($true))
            return
        }
    } catch {}
    try {
        if ($text.Length -gt 63) { $text = $text.Substring(0, 63) }
        $icon.Text = $text
    } catch {}
}

# 4. System Tray Icon: Kotak Rounded Corner dengan Animasi Garis Memutari Angka (48 Titik Super Halus & 20 FPS)
$script:trayOrbitCoords = @(
    @{ x = 8.0; y = 1.0 },  @{ x = 12.0; y = 1.0 }, @{ x = 16.0; y = 1.0 }, @{ x = 20.0; y = 1.0 },
    @{ x = 24.0; y = 1.0 }, @{ x = 28.0; y = 1.0 }, @{ x = 32.0; y = 1.0 }, @{ x = 36.0; y = 1.0 },
    @{ x = 40.0; y = 1.0 }, @{ x = 42.7; y = 1.5 }, @{ x = 44.9; y = 3.1 }, @{ x = 46.5; y = 5.3 },
    @{ x = 47.0; y = 8.0 },  @{ x = 47.0; y = 12.0 }, @{ x = 47.0; y = 16.0 }, @{ x = 47.0; y = 20.0 },
    @{ x = 47.0; y = 24.0 }, @{ x = 47.0; y = 28.0 }, @{ x = 47.0; y = 32.0 }, @{ x = 47.0; y = 36.0 },
    @{ x = 47.0; y = 40.0 }, @{ x = 46.5; y = 42.7 }, @{ x = 44.9; y = 44.9 }, @{ x = 42.7; y = 46.5 },
    @{ x = 40.0; y = 47.0 }, @{ x = 36.0; y = 47.0 }, @{ x = 32.0; y = 47.0 }, @{ x = 28.0; y = 47.0 },
    @{ x = 24.0; y = 47.0 }, @{ x = 20.0; y = 47.0 }, @{ x = 16.0; y = 47.0 }, @{ x = 12.0; y = 47.0 },
    @{ x = 8.0; y = 47.0 },  @{ x = 5.3; y = 46.5 },  @{ x = 3.1; y = 44.9 },  @{ x = 1.5; y = 42.7 },
    @{ x = 1.0; y = 40.0 },  @{ x = 1.0; y = 36.0 },  @{ x = 1.0; y = 32.0 },  @{ x = 1.0; y = 28.0 },
    @{ x = 1.0; y = 24.0 },  @{ x = 1.0; y = 20.0 },  @{ x = 1.0; y = 16.0 },  @{ x = 1.0; y = 12.0 },
    @{ x = 1.0; y = 8.0 },   @{ x = 1.5; y = 5.3 },   @{ x = 3.1; y = 3.1 },   @{ x = 5.3; y = 1.5 }
)

function Update-TrayVisual($pct5h, $activeUser, $activeQuota, $grandTotalStr, $isRunning = $false, $frame = 0, $taskCount = 0) {
    if (-not $script:notifyIcon) { return }
    try {
        $size = 48
        $bmp = [System.Drawing.Bitmap]::new($size, $size)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.Clear([System.Drawing.Color]::Transparent)

        # Warna dinamis sesuai sisa kuota 5-jam
        $ringColor = if ($pct5h -le 10) {
            [System.Drawing.Color]::FromArgb(255, 239, 68, 68)   # Merah (#EF4444)
        } elseif ($pct5h -le 25) {
            [System.Drawing.Color]::FromArgb(255, 245, 158, 11)  # Oranye Amber (#F59E0B)
        } else {
            [System.Drawing.Color]::FromArgb(255, 16, 185, 129)  # Hijau Emerald (#10B981)
        }

        # Bentuk Kotak Rounded Corner (Ujung Melengkung Modern - Penuh & Tegas)
        $inset = 1.0
        $r = 7.0
        $d = $r * 2.0
        $w = $size - ($inset * 2.0)
        $h = $size - ($inset * 2.0)

        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc($inset, $inset, $d, $d, 180, 90)
        $path.AddArc($inset + $w - $d, $inset, $d, $d, 270, 90)
        $path.AddArc($inset + $w - $d, $inset + $h - $d, $d, $d, 0, 90)
        $path.AddArc($inset, $inset + $h - $d, $d, $d, 90, 90)
        $path.CloseFigure()

        # Background gelap solid
        $bgBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(245, 9, 13, 20))
        $g.FillPath($bgBrush, $path)

        # Mode Tampilan Bergantian (Flip) Tiap 40 Ticks (tepat 2.0 detik @ 50ms) HANYA saat ada task running:
        # Tick 0..39 (2.0 detik): menampilkan sisa kuota 5 Jam (misal: "80")
        # Tick 40..79 (2.0 detik): menampilkan status task running (misal: "R1", "R2")
        $isTaskFrame = ($isRunning -and $taskCount -gt 0 -and (($frame % 80) -ge 40))

        # Warna track, bead neon, dan text disamakan mengikuti sisa kuota 5-jam (tanpa kuning terpisah)
        $trackColor  = [System.Drawing.Color]::FromArgb(140, $ringColor.R, $ringColor.G, $ringColor.B)
        $beadColor   = if ($pct5h -le 10) { [System.Drawing.Color]::FromArgb(255, 252, 165, 165) } elseif ($pct5h -le 25) { [System.Drawing.Color]::FromArgb(255, 253, 230, 138) } else { [System.Drawing.Color]::FromArgb(255, 110, 231, 183) }
        $textColor   = [System.Drawing.Color]::FromArgb(255, 255, 255, 255) # Putih solid tajam

        if ($isTaskFrame) {
            # --- State B: Running Tasks Display (R1, R2, dst.) - 2 Detik ---
            $textVal     = "R$taskCount"
            $fontSize    = if ($textVal.Length -ge 3) { 18.0 } else { 23.0 }
        } else {
            # --- State A: 5-Hour Quota Display (80, 100, dst.) - Statis atau 2 Detik saat running ---
            $textVal     = if ($pct5h -ge 100) { "100" } else { "$pct5h" }
            $fontSize    = if ($textVal.Length -ge 3) { 17.5 } elseif ($textVal.Length -eq 2) { 25.0 } else { 27.0 }
        }

        # 1. Base track border
        $trackPen = [System.Drawing.Pen]::new($trackColor, [float]2.6)
        $g.DrawPath($trackPen, $path)

        # 2. Animasi Garis Memutari Angka (HANYA AKTIF SAAT ADA TASK RUNNING BERJALAN)
        if ($isRunning -and $taskCount -gt 0) {
            # 48 titik halus mengitari perimeter luar kotak secara terus-menerus
            $step = $frame % 48
            $pt   = $script:trayOrbitCoords[$step]
            $pr1  = $script:trayOrbitCoords[($step - 1 + 48) % 48]
            $pr2  = $script:trayOrbitCoords[($step - 2 + 48) % 48]
            $pr3  = $script:trayOrbitCoords[($step - 3 + 48) % 48]
            $pr4  = $script:trayOrbitCoords[($step - 4 + 48) % 48]

            # Tail 4 (Faint edge)
            $t4Brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(40, $beadColor.R, $beadColor.G, $beadColor.B))
            $g.FillEllipse($t4Brush, [float]($pr4.x - 1.2), [float]($pr4.y - 1.2), [float]2.4, [float]2.4)
            $t4Brush.Dispose()

            # Tail 3 (Soft glow)
            $t3Brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(80, $beadColor.R, $beadColor.G, $beadColor.B))
            $g.FillEllipse($t3Brush, [float]($pr3.x - 1.8), [float]($pr3.y - 1.8), [float]3.6, [float]3.6)
            $t3Brush.Dispose()

            # Tail 2 (Medium glow)
            $t2Brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(130, $beadColor.R, $beadColor.G, $beadColor.B))
            $g.FillEllipse($t2Brush, [float]($pr2.x - 2.2), [float]($pr2.y - 2.2), [float]4.4, [float]4.4)
            $t2Brush.Dispose()

            # Tail 1 (Bright trail)
            $t1Brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(180, $beadColor.R, $beadColor.G, $beadColor.B))
            $g.FillEllipse($t1Brush, [float]($pr1.x - 2.6), [float]($pr1.y - 2.6), [float]5.2, [float]5.2)
            $t1Brush.Dispose()

            # Comet Head Halo
            $glowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(210, $beadColor.R, $beadColor.G, $beadColor.B))
            $g.FillEllipse($glowBrush, [float]($pt.x - 4.0), [float]($pt.y - 4.0), [float]8.0, [float]8.0)
            $glowBrush.Dispose()

            # Comet Head Core
            $coreBrush = [System.Drawing.SolidBrush]::new($beadColor)
            $g.FillEllipse($coreBrush, [float]($pt.x - 2.8), [float]($pt.y - 2.8), [float]5.6, [float]5.6)
            $coreBrush.Dispose()

            # White hot spark in center
            $sparkBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
            $g.FillEllipse($sparkBrush, [float]($pt.x - 1.4), [float]($pt.y - 1.4), [float]2.8, [float]2.8)
            $sparkBrush.Dispose()
        }

        # 3. Render angka ukuran raksasa di tengah (23-25pt)
        $font = [System.Drawing.Font]::new("Segoe UI", [float]$fontSize, [System.Drawing.FontStyle]::Bold)
        $sf   = [System.Drawing.StringFormat]::new([System.Drawing.StringFormat]::GenericTypographic)
        $sf.Alignment     = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

        $textBrush = [System.Drawing.SolidBrush]::new($textColor)
        $rect      = [System.Drawing.RectangleF]::new(0, 0, $size, $size)
        $g.DrawString($textVal, $font, $textBrush, $rect, $sf)

        $hIcon = $bmp.GetHicon()
        $newIcon = [System.Drawing.Icon]::FromHandle($hIcon).Clone()
        [Win32.WinAPI]::DestroyIcon($hIcon) | Out-Null

        $oldIcon = $script:notifyIcon.Icon
        $script:notifyIcon.Icon = $newIcon
        if ($oldIcon) { $oldIcon.Dispose() }

        $bgBrush.Dispose(); $trackPen.Dispose(); $path.Dispose()
        $font.Dispose(); $textBrush.Dispose(); $sf.Dispose()
        $g.Dispose(); $bmp.Dispose()
    } catch {}
}

# Live Tray Animation Tick (Dipanggil tiap 50ms: animasi komet hanya aktif saat task RUNNING)
function Update-TrayAnimationTick {
    try {
        if (-not $script:notifyIcon) { return }

        $taskCount = 0
        if ($script:cachedTaskInfo -and $script:cachedTaskInfo.chats) {
            if ($script:cachedTaskInfo.chats -is [System.Collections.IEnumerable] -and $script:cachedTaskInfo.chats -isnot [string]) {
                $taskCount = @($script:cachedTaskInfo.chats).Count
            } else {
                $taskCount = 1
            }
        }
        $isRunning = ($script:cachedTaskInfo -and $script:cachedTaskInfo.status -eq "RUNNING" -and $taskCount -gt 0)

        # JIKA TIDAK ADA TASK RUNNING: Ikon STATIS saja, jangan ada animasi berputar!
        if (-not $isRunning) {
            if ($script:lastTrayWasRunning) {
                $script:lastTrayWasRunning = $false
                $script:trayAnimFrame = 0
                $registry = $script:currentRegistry
                $activeUser = $script:currentActiveUser
                if ($registry -and $activeUser -and $registry.Contains($activeUser)) {
                    $actQuota = $registry[$activeUser].quota
                    $pct5h = if ($actQuota -and ($null -ne $actQuota.gemini5h)) { [int]$actQuota.gemini5h } else { 100 }
                    $grandStr = if ($txtGrandTotalTokens) { $txtGrandTotalTokens.Text } else { "0" }
                    Update-TrayVisual $pct5h $activeUser $actQuota $grandStr $false 0 0
                }
            }
            return
        }

        # JIKA SEDANG RUNNING: Putar komet mulus 20 FPS dan bergantian setiap 2 detik (40 frame @ 50ms)
        $script:lastTrayWasRunning = $true
        if (-not $script:trayAnimFrame) { $script:trayAnimFrame = 0 }
        $script:trayAnimFrame = ($script:trayAnimFrame + 1) % 80

        $registry = $script:currentRegistry
        if (-not $registry) { return }
        $activeUser = $script:currentActiveUser
        if (-not $registry.Contains($activeUser)) { return }

        $actQuota = $registry[$activeUser].quota
        $pct5h = if ($actQuota -and ($null -ne $actQuota.gemini5h)) { [int]$actQuota.gemini5h } else { 100 }
        $grandStr = if ($txtGrandTotalTokens) { $txtGrandTotalTokens.Text } else { "0" }

        Update-TrayVisual $pct5h $activeUser $actQuota $grandStr $isRunning $script:trayAnimFrame $taskCount
    } catch {}
}

# Tombol Pill Akun Horizontal (Pilih Akun Cepat & Rapi)
function New-AccountPill([string]$accKey, [bool]$isActive, [bool]$isSelected) {
    $btn = New-Object System.Windows.Controls.Button
    $btn.Margin = [System.Windows.Thickness]::new(0, 0, 5, 5)
    $btn.Padding = [System.Windows.Thickness]::new(8, 3.5, 8, 3.5)
    $btn.Cursor = [System.Windows.Input.Cursors]::Hand
    $btn.Tag = $accKey

    if ($isSelected) {
        if ($isActive) {
            $btn.Background = Get-Brush "#0D211B"
            $btn.BorderBrush = Get-Brush "#10B981"
            $btn.BorderThickness = [System.Windows.Thickness]::new(1.2)
        } else {
            $btn.Background = Get-Brush "#111B2B"
            $btn.BorderBrush = Get-Brush "#38BDF8"
            $btn.BorderThickness = [System.Windows.Thickness]::new(1.2)
        }
    } elseif ($isActive) {
        $btn.Background = Get-Brush "#071711"
        $btn.BorderBrush = Get-Brush "#134E39"
        $btn.BorderThickness = [System.Windows.Thickness]::new(1)
    } else {
        $btn.Background = Get-Brush "#0A101D"
        $btn.BorderBrush = Get-Brush "#1E293B"
        $btn.BorderThickness = [System.Windows.Thickness]::new(1)
    }

    $sp = New-Object System.Windows.Controls.StackPanel
    $sp.Orientation = [System.Windows.Controls.Orientation]::Horizontal

    $dot = New-Object System.Windows.Shapes.Ellipse
    $dot.Width = 5.5; $dot.Height = 5.5
    $dot.Margin = [System.Windows.Thickness]::new(0, 0, 5, 0)
    $dot.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
    $dot.Fill = if ($isActive) { Get-Brush "#10B981" } else { Get-Brush "#475569" }
    $sp.Children.Add($dot) | Out-Null

    $txt = New-Object System.Windows.Controls.TextBlock
    $txt.Text = $accKey
    $txt.FontSize = 9.0
    $txt.FontWeight = if ($isSelected -or $isActive) { [System.Windows.FontWeights]::SemiBold } else { [System.Windows.FontWeights]::Normal }
    $txt.Foreground = if ($isSelected) { if ($isActive) { Get-Brush "#34D399" } else { Get-Brush "#38BDF8" } } elseif ($isActive) { Get-Brush "#34D399" } else { Get-Brush "#94A3B8" }
    $txt.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
    $sp.Children.Add($txt) | Out-Null

    $btn.Content = $sp
    return $btn
}

# Update Tampilan Task Monitor Aktif (Mendukung Dropdown & Multi-Task Interaktif)
function Update-TaskMonitorDisplay {
    try {
        $taskInfo = Get-AntigravityActiveTask
        if (-not $taskInfo) { return }

        $chats = @()
        if ($taskInfo -and $taskInfo.chats) {
            if ($taskInfo.chats -is [System.Collections.IEnumerable] -and $taskInfo.chats -isnot [string]) {
                foreach ($c in $taskInfo.chats) { $chats += [string]$c }
            } else {
                $chats += [string]$taskInfo.chats
            }
        }
        $taskCount = $chats.Count
        $script:lastTaskCount = $taskCount

        if ($taskInfo.status -eq "RUNNING" -and $taskCount -gt 0) {
            # Ambil sisa kuota 5-jam untuk menyamakan warna task dengan 5-jam usage
            $registry = $script:currentRegistry
            if (-not $registry) { $registry = Get-AccountsRegistry }
            $activeUser = $script:currentActiveUser
            $activeQuota = if ($registry -and $activeUser -and $registry[$activeUser]) { $registry[$activeUser].quota } else { $null }
            $pct5h = if ($activeQuota -and ($null -ne $activeQuota.gemini5h)) { [int]$activeQuota.gemini5h } else { 100 }

            if ($pct5h -le 10) {
                # Kritis (Merah)
                $taskColorBg     = "#2A0A0A"
                $taskColorBorder = "#7F1D1D"
                $taskColorDot    = "#EF4444"
                $taskColorTxt    = "#F87171"
                $taskColorHeader = "#FCA5A5"
            } elseif ($pct5h -le 25) {
                # Waspada (Amber)
                $taskColorBg     = "#2A1505"
                $taskColorBorder = "#B45309"
                $taskColorDot    = "#F59E0B"
                $taskColorTxt    = "#FBBF24"
                $taskColorHeader = "#FDE68A"
            } else {
                # Sehat (Emerald / Hijau mengikuti 5-jam usage)
                $taskColorBg     = "#0D211B"
                $taskColorBorder = "#14533C"
                $taskColorDot    = "#10B981"
                $taskColorTxt    = "#34D399"
                $taskColorHeader = "#6EE7B7"
            }

            $badgeTaskStatus.Background = Get-Brush $taskColorBg
            $badgeTaskStatus.BorderBrush = Get-Brush $taskColorBorder
            $dotTaskStatus.Fill = Get-Brush $taskColorDot
            $txtTaskStatus.Foreground = Get-Brush $taskColorTxt
            $txtTaskStatus.Text = if ($taskCount -gt 1) { "RUNNING ($taskCount)" } else { "RUNNING" }

            # Jangan tampilkan judul chat di baris utama saat collapsed
            $lblTaskHeader.Text = "AKTIFITAS TASK SAAT INI:"
            $txtActiveChatTitle.Foreground = Get-Brush $taskColorHeader
            $txtActiveChatTitle.Text = if ($taskCount -gt 1) { "$taskCount task sedang berjalan" } else { "1 task sedang berjalan" }

            # Tampilkan tombol 3-stack yang diperbesar & warnanya mengikuti 5-jam usage
            $btnToggleTaskDropdown.Visibility = [System.Windows.Visibility]::Visible
            if ($iconTaskStack) { $iconTaskStack.Stroke = Get-Brush $taskColorDot }
            if ($txtTaskDropdownBtn) { $txtTaskDropdownBtn.Foreground = Get-Brush $taskColorHeader }
            if ($iconTaskDropdown) { $iconTaskDropdown.Stroke = Get-Brush $taskColorDot }

            if ($script:isTaskDropdownOpen) {
                $txtTaskDropdownBtn.Text = "Tutup"
                if ($iconTaskDropdown) { $iconTaskDropdown.Data = [System.Windows.Media.Geometry]::Parse("M 0 3.5 L 3.5 0 L 7 3.5") }
                if ($panelTaskDropdown.Tag -ne "closing") {
                    $panelTaskDropdown.Visibility = [System.Windows.Visibility]::Visible
                }

                # Render daftar semua task yang sedang running hanya saat dropdown terbuka
                $taskItemsListPanel.Children.Clear()
                for ($i = 0; $i -lt $taskCount; $i++) {
                    $chatTitle = $chats[$i]

                    $itemBorder = New-Object System.Windows.Controls.Border
                    $itemBorder.Background = Get-Brush "#59132036"
                    $itemBorder.BorderBrush = Get-Brush "#293B52"
                    $itemBorder.BorderThickness = [System.Windows.Thickness]::new(1)
                    $itemBorder.CornerRadius = [System.Windows.CornerRadius]::new(6)
                    $itemBorder.Padding = [System.Windows.Thickness]::new(10, 6.5, 10, 6.5)
                    $itemBorder.Margin = [System.Windows.Thickness]::new(0, 0, 0, 5)

                    $gridItem = New-Object System.Windows.Controls.Grid
                    $c1 = New-Object System.Windows.Controls.ColumnDefinition; $c1.Width = [System.Windows.GridLength]::Auto
                    $c2 = New-Object System.Windows.Controls.ColumnDefinition; $c2.Width = New-Object System.Windows.GridLength(1, [System.Windows.GridUnitType]::Star)
                    $c3 = New-Object System.Windows.Controls.ColumnDefinition; $c3.Width = [System.Windows.GridLength]::Auto
                    $gridItem.ColumnDefinitions.Add($c1)
                    $gridItem.ColumnDefinitions.Add($c2)
                    $gridItem.ColumnDefinitions.Add($c3)

                    # Col 0: Dot Indicator (Tanpa angka #1, #2, dst.)
                    $d = New-Object System.Windows.Shapes.Ellipse
                    $d.Width = 6.0; $d.Height = 6.0
                    $d.Fill = Get-Brush $taskColorDot
                    $d.Margin = [System.Windows.Thickness]::new(0, 0, 8, 0)
                    $d.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
                    [System.Windows.Controls.Grid]::SetColumn($d, 0)
                    $gridItem.Children.Add($d) | Out-Null

                    # Col 1: Chat Title
                    $tTitle = New-Object System.Windows.Controls.TextBlock
                    $tTitle.Text = $chatTitle
                    $tTitle.FontSize = 9.0
                    $tTitle.FontWeight = [System.Windows.FontWeights]::SemiBold
                    $tTitle.Foreground = Get-Brush "#F8FAFC"
                    $tTitle.TextTrimming = [System.Windows.TextTrimming]::CharacterEllipsis
                    $tTitle.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
                    [System.Windows.Controls.Grid]::SetColumn($tTitle, 1)
                    $gridItem.Children.Add($tTitle) | Out-Null

                    # Col 2: Badge (RUNNING)
                    $bState = New-Object System.Windows.Controls.Border
                    $bState.CornerRadius = [System.Windows.CornerRadius]::new(3)
                    $bState.Padding = [System.Windows.Thickness]::new(5, 1.5, 5, 1.5)
                    $bState.Background = Get-Brush $taskColorBg
                    $bState.BorderBrush = Get-Brush $taskColorBorder
                    $bState.BorderThickness = [System.Windows.Thickness]::new(1)
                    $bState.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
                    $bState.Margin = [System.Windows.Thickness]::new(6, 0, 0, 0)

                    $tState = New-Object System.Windows.Controls.TextBlock
                    $tState.Text = "RUNNING"
                    $tState.FontSize = 7.0
                    $tState.FontWeight = [System.Windows.FontWeights]::Bold
                    $tState.Foreground = Get-Brush $taskColorTxt
                    $bState.Child = $tState

                    [System.Windows.Controls.Grid]::SetColumn($bState, 2)
                    $gridItem.Children.Add($bState) | Out-Null

                    $itemBorder.Child = $gridItem
                    $taskItemsListPanel.Children.Add($itemBorder) | Out-Null
                }
            } else {
                $txtTaskDropdownBtn.Text = "$taskCount Task"
                if ($iconTaskDropdown) { $iconTaskDropdown.Data = [System.Windows.Media.Geometry]::Parse("M 0 0 L 3.5 3.5 L 7 0") }
                if ($panelTaskDropdown.Tag -ne "closing") {
                    $panelTaskDropdown.Visibility = [System.Windows.Visibility]::Collapsed
                }
            }
        } else {
            $badgeTaskStatus.Background = Get-Brush "#0A1F17"
            $badgeTaskStatus.BorderBrush = Get-Brush "#14533C"
            $dotTaskStatus.Fill = Get-Brush "#10B981"
            $txtTaskStatus.Foreground = Get-Brush "#34D399"
            $txtTaskStatus.Text = "IDLE"
            $lblTaskHeader.Text = "AKTIFITAS TASK SAAT INI:"
            $txtActiveChatTitle.Foreground = Get-Brush "#94A3B8"
            $txtActiveChatTitle.Text = "Tidak ada task aktif"
            $btnToggleTaskDropdown.Visibility = [System.Windows.Visibility]::Collapsed
            if ($script:isTaskDropdownOpen) {
                $script:isTaskDropdownOpen = $false
                Animate-DropdownClose $panelTaskDropdown
            } else {
                if ($panelTaskDropdown.Tag -ne "closing") {
                    $panelTaskDropdown.Visibility = [System.Windows.Visibility]::Collapsed
                }
            }
        }
    } catch {}
}

# 5. Render UI dari Memory Cache
function Update-WidgetView {
    try {
        if (-not $script:currentRegistry) { $script:currentRegistry = Get-AccountsRegistry }
        $registry = $script:currentRegistry
        $activeUser = $script:currentActiveUser

        $txtActiveAccount.Text = $activeUser

        $allAccountKeys = @($activeUser) + @($registry.Keys | Where-Object { $_ -ne $activeUser })
        if ([string]::IsNullOrWhiteSpace($script:selectedProfile) -or ($allAccountKeys -notcontains $script:selectedProfile)) {
            $script:selectedProfile = $activeUser
        }

        $activeCount = 1
        $idleCount = [Math]::Max(0, $allAccountKeys.Count - 1)
        $txtTotalAccountsCount.Text = "$activeCount Aktif | $idleCount Idle"

        # Hitung Akumulasi Global Riil (Opsi A: Deduplikasi Bersih Langsung dari Transkrip Disk)
        $globalStats = Get-GlobalTranscriptTotals
        $grandInput  = [int64]$globalStats.Input
        $grandOutput = [int64]$globalStats.Output
        $grandCache  = [int64]$globalStats.Cache
        $grandTotal  = [int64]$globalStats.Total

        $grandTotalStr = Format-CompactNumber $grandTotal "0 M"
        $txtGrandTotalTokens.Text   = $grandTotalStr
        $txtGlobalInput.Text        = Format-CompactNumber $grandInput "0 M"
        $txtGlobalOutput.Text       = Format-CompactNumber $grandOutput "0 M"
        $txtGlobalCache.Text        = Format-CompactNumber $grandCache "0 B"
        if ($txtGrandTotalCost) {
            $grandCost = Format-EstimatedCost $grandInput $grandOutput $grandCache $grandTotal
            $txtGrandTotalCost.Text = $grandCost.Full
        }

        # 1. Update Selector Button to reflect current selected account
        $isSelectedActive = ($script:selectedProfile -eq $activeUser)
        $txtSelectedAccountBtnLabel.Text = $script:selectedProfile
        $txtTotalAccountsCount.Text = "($($allAccountKeys.Count) Akun)"

        if ($isSelectedActive) {
            $dotSelectedAccountBtn.Fill = Get-Brush "#10B981"
            $badgeSelectedAccountBtn.Background = Get-Brush "#4D0D211B"
            $badgeSelectedAccountBtn.BorderBrush = Get-Brush "#14533C"
            $txtBadgeSelectedAccountBtn.Foreground = Get-Brush "#34D399"
            $txtBadgeSelectedAccountBtn.Text = "AKTIF"
            $btnAccountSelectorDropdown.Background = Get-Brush "#5916243A"
            $btnAccountSelectorDropdown.BorderBrush = Get-Brush "#14533C"
        } else {
            $dotSelectedAccountBtn.Fill = Get-Brush "#38BDF8"
            $badgeSelectedAccountBtn.Background = Get-Brush "#5916243A"
            $badgeSelectedAccountBtn.BorderBrush = Get-Brush "#2B3C54"
            $txtBadgeSelectedAccountBtn.Foreground = Get-Brush "#64748B"
            $txtBadgeSelectedAccountBtn.Text = "IDLE"
            $btnAccountSelectorDropdown.Background = Get-Brush "#5916243A"
            $btnAccountSelectorDropdown.BorderBrush = Get-Brush "#0284C7"
        }

        if ($script:isAccountsDropdownOpen) {
            if ($panelAccountsDropdown.Tag -ne "closing") {
                $panelAccountsDropdown.Visibility = [System.Windows.Visibility]::Visible
            }
            if ($iconAccountDropdownArrow) { $iconAccountDropdownArrow.Data = [System.Windows.Media.Geometry]::Parse("M 0 3.5 L 3.5 0 L 7 3.5") }

            # 2. Populate All Registered Accounts in Dropdown List only when open
            $listAccountsPanel.Children.Clear()
            foreach ($accKey in $allAccountKeys) {
                $isThisActive   = ($accKey -eq $activeUser)
                $isThisSelected = ($accKey -eq $script:selectedProfile)
                $accData = $registry[$accKey]
                $tokVal = if ($accData -and $accData.tokens -and $accData.tokens.Total) { [int64]$accData.tokens.Total } else { [int64]0 }
                $tokStr = Format-CompactNumber $tokVal "0 M"

                $itemBtn = New-Object System.Windows.Controls.Button
                $itemBtn.Tag = $accKey
                $itemBtn.Cursor = [System.Windows.Input.Cursors]::Hand
                $itemBtn.Margin = [System.Windows.Thickness]::new(2, 2, 2, 2)
                $itemBtn.HorizontalContentAlignment = [System.Windows.HorizontalAlignment]::Stretch

                $itemBorder = New-Object System.Windows.Controls.Border
                $itemBorder.CornerRadius = [System.Windows.CornerRadius]::new(5)
                $itemBorder.Padding = [System.Windows.Thickness]::new(7, 5, 7, 5)
                $itemBorder.BorderThickness = [System.Windows.Thickness]::new(1)

                if ($isThisSelected) {
                    $itemBorder.Background = Get-Brush "#80132337"
                    $itemBorder.BorderBrush = Get-Brush "#0284C7"
                } else {
                    $itemBorder.Background = Get-Brush "#590D1524"
                    $itemBorder.BorderBrush = Get-Brush "#293B52"
                }

                $cardStack = New-Object System.Windows.Controls.StackPanel

                # Baris Atas: Dot + Nama Akun (Kiri), Badge Status (Kanan)
                $row0 = New-Object System.Windows.Controls.Grid
                $c0_0 = New-Object System.Windows.Controls.ColumnDefinition; $c0_0.Width = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star)
                $c0_1 = New-Object System.Windows.Controls.ColumnDefinition; $c0_1.Width = [System.Windows.GridLength]::Auto
                $row0.ColumnDefinitions.Add($c0_0)
                $row0.ColumnDefinitions.Add($c0_1)

                $nameSp = New-Object System.Windows.Controls.StackPanel
                $nameSp.Orientation = [System.Windows.Controls.Orientation]::Horizontal
                $nameSp.VerticalAlignment = [System.Windows.VerticalAlignment]::Center

                $dot = New-Object System.Windows.Shapes.Ellipse
                $dot.Width = 6; $dot.Height = 6
                $dot.Fill = if ($isThisActive) { Get-Brush "#10B981" } else { Get-Brush "#64748B" }
                $dot.Margin = [System.Windows.Thickness]::new(0, 0, 5, 0)
                $dot.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
                $nameSp.Children.Add($dot) | Out-Null

                $nameTb = New-Object System.Windows.Controls.TextBlock
                $nameTb.Text = $accKey
                $nameTb.FontSize = 9.0
                $nameTb.FontWeight = if ($isThisSelected) { [System.Windows.FontWeights]::Bold } else { [System.Windows.FontWeights]::SemiBold }
                $nameTb.Foreground = if ($isThisSelected) { Get-Brush "#F8FAFC" } elseif ($isThisActive) { Get-Brush "#34D399" } else { Get-Brush "#CBD5E1" }
                $nameTb.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI Variable Display, Segoe UI, sans-serif")
                $nameTb.TextTrimming = [System.Windows.TextTrimming]::CharacterEllipsis
                $nameTb.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
                $nameSp.Children.Add($nameTb) | Out-Null

                [System.Windows.Controls.Grid]::SetColumn($nameSp, 0)
                $row0.Children.Add($nameSp) | Out-Null

                # Badge (Kanan)
                $badge = New-Object System.Windows.Controls.Border
                $badge.CornerRadius = [System.Windows.CornerRadius]::new(3)
                $badge.Padding = [System.Windows.Thickness]::new(4, 1, 4, 1)
                $badge.BorderThickness = [System.Windows.Thickness]::new(1)
                $badge.VerticalAlignment = [System.Windows.VerticalAlignment]::Center

                $badgeTxt = New-Object System.Windows.Controls.TextBlock
                $badgeTxt.FontSize = 6.5
                $badgeTxt.FontWeight = [System.Windows.FontWeights]::Bold
                $badgeTxt.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI Variable Display, Segoe UI, sans-serif")

                if ($isThisActive -and $isThisSelected) {
                    $badge.Background = Get-Brush "#0D211B"
                    $badge.BorderBrush = Get-Brush "#10B981"
                    $badgeTxt.Foreground = Get-Brush "#34D399"
                    $badgeTxt.Text = "AKTIF"
                } elseif ($isThisSelected) {
                    $badge.Background = Get-Brush "#0C2340"
                    $badge.BorderBrush = Get-Brush "#0284C7"
                    $badgeTxt.Foreground = Get-Brush "#38BDF8"
                    $badgeTxt.Text = "TERPILIH"
                } elseif ($isThisActive) {
                    $badge.Background = Get-Brush "#0D211B"
                    $badge.BorderBrush = Get-Brush "#14533C"
                    $badgeTxt.Foreground = Get-Brush "#34D399"
                    $badgeTxt.Text = "AKTIF"
                } else {
                    $badge.Background = Get-Brush "#111827"
                    $badge.BorderBrush = Get-Brush "#1E293B"
                    $badgeTxt.Foreground = Get-Brush "#64748B"
                    $badgeTxt.Text = "IDLE"
                }
                $badge.Child = $badgeTxt
                [System.Windows.Controls.Grid]::SetColumn($badge, 1)
                $row0.Children.Add($badge) | Out-Null

                $cardStack.Children.Add($row0) | Out-Null

                # Baris Bawah: Token Total + Estimasi Biaya
                $row1 = New-Object System.Windows.Controls.Grid
                $row1.Margin = [System.Windows.Thickness]::new(11, 3, 0, 0)
                $c1_0 = New-Object System.Windows.Controls.ColumnDefinition; $c1_0.Width = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star)
                $c1_1 = New-Object System.Windows.Controls.ColumnDefinition; $c1_1.Width = [System.Windows.GridLength]::Auto
                $row1.ColumnDefinitions.Add($c1_0)
                $row1.ColumnDefinitions.Add($c1_1)

                $tokTb = New-Object System.Windows.Controls.TextBlock
                $tokTb.Text = "$tokStr"
                $tokTb.FontSize = 8.5
                $tokTb.FontWeight = [System.Windows.FontWeights]::Bold
                $tokTb.Foreground = Get-Brush "#38BDF8"
                $tokTb.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI Variable Display, Segoe UI, sans-serif")
                $tokTb.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
                [System.Windows.Controls.Grid]::SetColumn($tokTb, 0)
                $row1.Children.Add($tokTb) | Out-Null

                # Estimasi Nilai Akun
                $accIn  = if ($accData -and $accData.tokens -and $accData.tokens.Input)  { [int64]$accData.tokens.Input }  else { [int64]0 }
                $accOut = if ($accData -and $accData.tokens -and $accData.tokens.Output) { [int64]$accData.tokens.Output } else { [int64]0 }
                $accCch = if ($accData -and $accData.tokens -and $accData.tokens.Cache)  { [int64]$accData.tokens.Cache }  else { [int64]0 }
                $accCost = Format-EstimatedCost $accIn $accOut $accCch $tokVal

                $costTb = New-Object System.Windows.Controls.TextBlock
                $costTb.Text = "$($accCost.Short)"
                $costTb.FontSize = 7.5
                $costTb.Foreground = Get-Brush "#34D399"
                $costTb.FontFamily = New-Object System.Windows.Media.FontFamily("Segoe UI Variable Display, Segoe UI, sans-serif")
                $costTb.VerticalAlignment = [System.Windows.VerticalAlignment]::Center
                [System.Windows.Controls.Grid]::SetColumn($costTb, 1)
                $row1.Children.Add($costTb) | Out-Null

                $cardStack.Children.Add($row1) | Out-Null

                $itemBorder.Child = $cardStack
                $itemBtn.Content = $itemBorder

                $itemBtn.Add_Click({
                    $script:selectedProfile = $this.Tag
                    $script:isAccountsDropdownOpen = $false
                    if ($iconAccountDropdownArrow) { $iconAccountDropdownArrow.Data = [System.Windows.Media.Geometry]::Parse("M 0 0 L 3.5 3.5 L 7 0") }
                    Animate-DropdownClose $panelAccountsDropdown
                    Update-WidgetView
                })

                $listAccountsPanel.Children.Add($itemBtn) | Out-Null
            }
        } else {
            if ($panelAccountsDropdown.Tag -ne "closing") {
                $panelAccountsDropdown.Visibility = [System.Windows.Visibility]::Collapsed
            }
            if ($iconAccountDropdownArrow) { $iconAccountDropdownArrow.Data = [System.Windows.Media.Geometry]::Parse("M 0 0 L 3.5 3.5 L 7 0") }
        }

        # Render Kartu Quota Utama (Featured Card) untuk Akun Terpilih ($script:selectedProfile)
        $selectedData = $registry[$script:selectedProfile]
        $isSelectedActive = ($script:selectedProfile -eq $activeUser)

        $txtFeaturedAccountName.Text = $script:selectedProfile
        $dotFeaturedAccount.Fill     = if ($isSelectedActive) { Get-Brush "#10B981" } else { Get-Brush "#475569" }

        if ($isSelectedActive) {
            $badgeFeaturedAccountState.Background = Get-Brush "#0D211B"
            $badgeFeaturedAccountState.BorderBrush = Get-Brush "#14533C"
            $txtFeaturedAccountState.Foreground   = Get-Brush "#34D399"
            $txtFeaturedAccountState.Text         = "ACTIVE"
        } else {
            $badgeFeaturedAccountState.Background = Get-Brush "#111827"
            $badgeFeaturedAccountState.BorderBrush = Get-Brush "#1E293B"
            $txtFeaturedAccountState.Foreground   = Get-Brush "#64748B"
            $txtFeaturedAccountState.Text         = "IDLE"
        }

        $selTok = if ($selectedData -and $selectedData.tokens -and $selectedData.tokens.Total) {
            [int64]$selectedData.tokens.Total
        } else { [int64]0 }
        $txtFeaturedAccountToken.Text = Format-CompactNumber $selTok "0 M"

        if ($txtFeaturedAccountCost) {
            $tData = if ($selectedData -and $selectedData.tokens) { $selectedData.tokens } else { $null }
            $accIn  = if ($tData -and $tData.Input)  { [int64]$tData.Input }  else { [int64]0 }
            $accOut = if ($tData -and $tData.Output) { [int64]$tData.Output } else { [int64]0 }
            $accCch = if ($tData -and $tData.Cache)  { [int64]$tData.Cache }  else { [int64]0 }
            $accCost = Format-EstimatedCost $accIn $accOut $accCch $selTok
            $txtFeaturedAccountCost.Text = " | $($accCost.Short)"
        }

        $q = if ($selectedData) { $selectedData.quota } else { $null }

        $g5 = if ($q -and $null -ne $q.gemini5h)     { [int]$q.gemini5h }     else { 100 }
        $gw = if ($q -and $null -ne $q.geminiWeekly) { [int]$q.geminiWeekly } else { 100 }
        $c5 = if ($q -and $null -ne $q.claude5h)     { [int]$q.claude5h }     else { 100 }
        $cw = if ($q -and $null -ne $q.claudeWeekly) { [int]$q.claudeWeekly } else { 100 }

        $rawG5 = if ($q -and -not [string]::IsNullOrWhiteSpace($q.gemini5hResetIso)) {
            Format-ResetTime $q.gemini5hResetIso
        } elseif ($q -and $q.gemini5hReset) { $q.gemini5hReset } else { "Ready" }
        $strG5 = if ($g5 -ge 100 -or $rawG5 -match 'Ready|Fresh') { "Ready" } else { $rawG5 }

        $rawGW = if ($q -and -not [string]::IsNullOrWhiteSpace($q.geminiWeeklyResetIso)) {
            Format-ResetTime $q.geminiWeeklyResetIso
        } elseif ($q -and $q.geminiWeeklyReset) { $q.geminiWeeklyReset } else { "Ready" }
        $strGW = if ($gw -ge 100 -or $rawGW -match 'Ready|Fresh') { "Ready" } else { $rawGW }

        $rawC5 = if ($q -and -not [string]::IsNullOrWhiteSpace($q.claude5hResetIso)) {
            Format-ResetTime $q.claude5hResetIso
        } elseif ($q -and $q.claude5hReset) { $q.claude5hReset } else { "Ready" }
        $strC5 = if ($c5 -ge 100 -or $rawC5 -match 'Ready|Fresh') { "Ready" } else { $rawC5 }

        $rawCW = if ($q -and -not [string]::IsNullOrWhiteSpace($q.claudeWeeklyResetIso)) {
            Format-ResetTime $q.claudeWeeklyResetIso
        } elseif ($q -and $q.claudeWeeklyReset) { $q.claudeWeeklyReset } else { "Ready" }
        $strCW = if ($cw -ge 100 -or $rawCW -match 'Ready|Fresh') { "Ready" } else { $rawCW }

        $g5Brush = if ($g5 -le 15) { Get-Brush "#EF4444" } elseif ($g5 -le 35) { Get-Brush "#F59E0B" } else { Get-Brush "#10B981" }
        $gwBrush = if ($gw -le 15) { Get-Brush "#EF4444" } elseif ($gw -le 35) { Get-Brush "#F59E0B" } else { Get-Brush "#10B981" }
        $c5Brush = if ($c5 -le 15) { Get-Brush "#EF4444" } elseif ($c5 -le 35) { Get-Brush "#F59E0B" } else { Get-Brush "#10B981" }
        $cwBrush = if ($cw -le 15) { Get-Brush "#EF4444" } elseif ($cw -le 35) { Get-Brush "#F59E0B" } else { Get-Brush "#10B981" }

        # Update Tampilan Quota Utama dengan Bar Besar & Nilai Jelas
        $txtFeaturedG5Val.Text = "$g5%"
        $txtFeaturedG5Val.Foreground = $g5Brush
        $progFeaturedG5.Value = $g5
        $progFeaturedG5.Foreground = $g5Brush
        $txtFeaturedG5Reset.Text = $strG5
        $txtFeaturedG5Reset.Foreground = if ($strG5 -eq "Ready") { Get-Brush "#10B981" } else { Get-Brush "#64748B" }

        $txtFeaturedGWVal.Text = "$gw%"
        $txtFeaturedGWVal.Foreground = $gwBrush
        $progFeaturedGW.Value = $gw
        $progFeaturedGW.Foreground = $gwBrush
        $txtFeaturedGWReset.Text = $strGW
        $txtFeaturedGWReset.Foreground = if ($strGW -eq "Ready") { Get-Brush "#10B981" } else { Get-Brush "#64748B" }

        $txtFeaturedC5Val.Text = "$c5%"
        $txtFeaturedC5Val.Foreground = $c5Brush
        $progFeaturedC5.Value = $c5
        $progFeaturedC5.Foreground = $c5Brush
        $txtFeaturedC5Reset.Text = $strC5
        $txtFeaturedC5Reset.Foreground = if ($strC5 -eq "Ready") { Get-Brush "#10B981" } else { Get-Brush "#64748B" }

        $txtFeaturedCWVal.Text = "$cw%"
        $txtFeaturedCWVal.Foreground = $cwBrush
        $progFeaturedCW.Value = $cw
        $progFeaturedCW.Foreground = $cwBrush
        $txtFeaturedCWReset.Text = $strCW
        $txtFeaturedCWReset.Foreground = if ($strCW -eq "Ready") { Get-Brush "#10B981" } else { Get-Brush "#64748B" }

        # Update Tombol Beralih Akun & Salin Resume Prompt
        if ($btnSwitchAccount -and $txtBtnSwitchAccount) {
            if (-not $isSelectedActive) {
                # Sedang melihat profil akun lain (Idle) -> tombol ganti ke akun ini
                $btnSwitchAccount.Visibility = [System.Windows.Visibility]::Visible
                $txtBtnSwitchAccount.Text = "BERALIH KE $($script:selectedProfile.ToUpper()) & SALIN RESUME PROMPT"
                $btnSwitchAccount.Background = Get-Brush "#064E3B"
                $btnSwitchAccount.BorderBrush = Get-Brush "#10B981"
                $txtBtnSwitchAccount.Foreground = Get-Brush "#34D399"
            } elseif ($g5 -le 0 -or $gw -le 0) {
                # Akun aktif tetapi kuota habis (0%) -> tombol peringatan & ganti ke cadangan
                $btnSwitchAccount.Visibility = [System.Windows.Visibility]::Visible
                $txtBtnSwitchAccount.Text = "QUOTA HABIS! GANTI KE AKUN CADANGAN & RESUME"
                $btnSwitchAccount.Background = Get-Brush "#7F1D1D"
                $btnSwitchAccount.BorderBrush = Get-Brush "#EF4444"
                $txtBtnSwitchAccount.Foreground = Get-Brush "#FCA5A5"
            } else {
                # Akun aktif dan kuota masih ada -> sembunyikan tombol
                $btnSwitchAccount.Visibility = [System.Windows.Visibility]::Collapsed
            }
        }

        # Perbarui Task Monitor
        Update-TaskMonitorDisplay

        # Update Tray Icon
        $activeQuota = if ($registry[$activeUser]) { $registry[$activeUser].quota } else { $null }
        $pct5h = if ($activeQuota -and ($null -ne $activeQuota.gemini5h)) { [int]$activeQuota.gemini5h } else { 100 }
        $taskCount = 0
        if ($script:cachedTaskInfo -and $script:cachedTaskInfo.chats) {
            if ($script:cachedTaskInfo.chats -is [System.Collections.IEnumerable] -and $script:cachedTaskInfo.chats -isnot [string]) {
                $taskCount = @($script:cachedTaskInfo.chats).Count
            } else {
                $taskCount = 1
            }
        }
        $isRunning = ($script:cachedTaskInfo -and $script:cachedTaskInfo.status -eq "RUNNING" -and $taskCount -gt 0)
        Update-TrayVisual $pct5h $activeUser $activeQuota $grandTotalStr $isRunning $script:trayAnimFrame $taskCount
    } catch {}
}

# 6. Realtime Countdown Engine (1-Second Tick) & 00:00 Auto Reset
function Update-RealtimeCountdownTick {
    try {
        $registry = $script:currentRegistry
        if (-not $registry) { return }

        $quotaResetTriggered = $false

        foreach ($accKey in $registry.Keys) {
            $acc = $registry[$accKey]
            if (-not $acc) { continue }
            $hasReset = Reconcile-AccountQuotaExpiry $acc
            if ($hasReset) { $quotaResetTriggered = $true }
        }

        # Realtime tick update pada Featured Quota Card untuk akun yang sedang dilihat ($script:selectedProfile)
        $selProfile = $script:selectedProfile
        if ($registry.Contains($selProfile)) {
            $q = $registry[$selProfile].quota
            if ($q) {
                # 1. Gemini 5h
                $g5 = if ($null -ne $q.gemini5h) { [int]$q.gemini5h } else { 100 }
                $raw5 = if (-not [string]::IsNullOrWhiteSpace($q.gemini5hResetIso)) {
                    Format-ResetTime $q.gemini5hResetIso
                } elseif ($q.gemini5hReset) { $q.gemini5hReset } else { "Ready" }
                $str5 = if ($g5 -ge 100 -or $raw5 -match 'Ready|Fresh') { "Ready" } else { $raw5 }
                $g5Brush = if ($g5 -le 15) { Get-Brush "#EF4444" } elseif ($g5 -le 35) { Get-Brush "#F59E0B" } else { Get-Brush "#10B981" }

                $txtFeaturedG5Val.Text = "$g5%"
                $txtFeaturedG5Val.Foreground = $g5Brush
                $progFeaturedG5.Value = $g5
                $progFeaturedG5.Foreground = $g5Brush
                $txtFeaturedG5Reset.Text = $str5
                $txtFeaturedG5Reset.Foreground = if ($str5 -eq "Ready") { Get-Brush "#10B981" } else { Get-Brush "#64748B" }

                # 2. Gemini Weekly
                $gw = if ($null -ne $q.geminiWeekly) { [int]$q.geminiWeekly } else { 100 }
                $rawW = if (-not [string]::IsNullOrWhiteSpace($q.geminiWeeklyResetIso)) {
                    Format-ResetTime $q.geminiWeeklyResetIso
                } elseif ($q.geminiWeeklyReset) { $q.geminiWeeklyReset } else { "Ready" }
                $strW = if ($gw -ge 100 -or $rawW -match 'Ready|Fresh') { "Ready" } else { $rawW }
                $gwBrush = if ($gw -le 15) { Get-Brush "#EF4444" } elseif ($gw -le 35) { Get-Brush "#F59E0B" } else { Get-Brush "#10B981" }

                $txtFeaturedGWVal.Text = "$gw%"
                $txtFeaturedGWVal.Foreground = $gwBrush
                $progFeaturedGW.Value = $gw
                $progFeaturedGW.Foreground = $gwBrush
                $txtFeaturedGWReset.Text = $strW
                $txtFeaturedGWReset.Foreground = if ($strW -eq "Ready") { Get-Brush "#10B981" } else { Get-Brush "#64748B" }

                # 3. Claude 5h
                $c5 = if ($null -ne $q.claude5h) { [int]$q.claude5h } else { 100 }
                $rawC5 = if (-not [string]::IsNullOrWhiteSpace($q.claude5hResetIso)) {
                    Format-ResetTime $q.claude5hResetIso
                } elseif ($q.claude5hReset) { $q.claude5hReset } else { "Ready" }
                $strC5 = if ($c5 -ge 100 -or $rawC5 -match 'Ready|Fresh') { "Ready" } else { $rawC5 }
                $c5Brush = if ($c5 -le 15) { Get-Brush "#EF4444" } elseif ($c5 -le 35) { Get-Brush "#F59E0B" } else { Get-Brush "#10B981" }

                $txtFeaturedC5Val.Text = "$c5%"
                $txtFeaturedC5Val.Foreground = $c5Brush
                $progFeaturedC5.Value = $c5
                $progFeaturedC5.Foreground = $c5Brush
                $txtFeaturedC5Reset.Text = $strC5
                $txtFeaturedC5Reset.Foreground = if ($strC5 -eq "Ready") { Get-Brush "#10B981" } else { Get-Brush "#64748B" }

                # 4. Claude Weekly
                $cw = if ($null -ne $q.claudeWeekly) { [int]$q.claudeWeekly } else { 100 }
                $rawCW = if (-not [string]::IsNullOrWhiteSpace($q.claudeWeeklyResetIso)) {
                    Format-ResetTime $q.claudeWeeklyResetIso
                } elseif ($q.claudeWeeklyReset) { $q.claudeWeeklyReset } else { "Ready" }
                $strCW = if ($cw -ge 100 -or $rawCW -match 'Ready|Fresh') { "Ready" } else { $rawCW }
                $cwBrush = if ($cw -le 15) { Get-Brush "#EF4444" } elseif ($cw -le 35) { Get-Brush "#F59E0B" } else { Get-Brush "#10B981" }

                $txtFeaturedCWVal.Text = "$cw%"
                $txtFeaturedCWVal.Foreground = $cwBrush
                $progFeaturedCW.Value = $cw
                $progFeaturedCW.Foreground = $cwBrush
                $txtFeaturedCWReset.Text = $strCW
                $txtFeaturedCWReset.Foreground = if ($strCW -eq "Ready") { Get-Brush "#10B981" } else { Get-Brush "#64748B" }
            }
        }

        # Update Task Monitor realtime setiap detik (asynchronous non-blocking)
        Update-TaskMonitorDisplay

        # Live Update System Tray & Animasi Saat Ada Task Berjalan
        $activeUser = $script:currentActiveUser
        if ($registry.Contains($activeUser)) {
            $actQuota = $registry[$activeUser].quota
            $pct5h = if ($actQuota -and ($null -ne $actQuota.gemini5h)) { [int]$actQuota.gemini5h } else { 100 }
            $pctWeekly = if ($actQuota -and ($null -ne $actQuota.geminiWeekly)) { [int]$actQuota.geminiWeekly } else { 100 }
            $r5 = if ($actQuota -and $actQuota.gemini5hReset) { $actQuota.gemini5hReset } else { "Fresh Quota" }
            $rw = if ($actQuota -and $actQuota.geminiWeeklyReset) { $actQuota.geminiWeeklyReset } else { "Fresh Quota" }
            $grandStr = if ($txtGrandTotalTokens) { $txtGrandTotalTokens.Text } else { "0" }

            $taskCount = 0
            if ($script:cachedTaskInfo -and $script:cachedTaskInfo.chats) {
                if ($script:cachedTaskInfo.chats -is [System.Collections.IEnumerable] -and $script:cachedTaskInfo.chats -isnot [string]) {
                    $taskCount = @($script:cachedTaskInfo.chats).Count
                } else {
                    $taskCount = 1
                }
            }
            $isRunning = ($script:cachedTaskInfo -and $script:cachedTaskInfo.status -eq "RUNNING" -and $taskCount -gt 0)

            $statusText = if ($isRunning) { "⚡ RUNNING (R$taskCount) | " } else { "R0 (IDLE) | " }
            $tip = "AG [$activeUser] | ${statusText}Total: $grandStr`n5-Hour: $pct5h% ($r5)`nWeekly: $pctWeekly% ($rw)"
            Set-NotifyIconText $script:notifyIcon $tip

            $script:lastTrayPct = $pct5h
            $script:lastTrayRunning = $isRunning
            $script:lastTrayTaskCount = $taskCount

            if (-not $isRunning) {
                Update-TrayVisual $pct5h $activeUser $actQuota $grandStr $false 0 0
            }

            # Auto-Switch Guard: Jika quota akun aktif habis (0%), otomatis beralih ke cadangan berkuota
            if ($pct5h -le 0 -or $pctWeekly -le 0) {
                $now = Get-Date
                if (-not $script:firstExhaustedTime) { $script:firstExhaustedTime = $now }
                $exhaustedSecs = ($now - $script:firstExhaustedTime).TotalSeconds

                if (-not $script:lastAutoSwitchAttempt -or ($now - $script:lastAutoSwitchAttempt).TotalMinutes -ge 1) {
                    # Beralih jika task IDLE, atau jika task stuck di RUNNING karena kuota 0% selama > 10 detik
                    if (-not $isRunning -or $exhaustedSecs -ge 10) {
                        $script:lastAutoSwitchAttempt = $now

                        # Cari kandidat akun yang benar-benar memiliki folder profil di Antigravity\Profiles dan kuota > 0
                        $profilesDir = "$env:APPDATA\Antigravity\Profiles"
                        $existingProfiles = if (Test-Path $profilesDir) { Get-ChildItem -Path $profilesDir -Directory -ErrorAction SilentlyContinue } else { @() }

                        $candidates = @()
                        foreach ($k in $registry.Keys) {
                            if ($k -ne $activeUser) {
                                $bq = $registry[$k].quota
                                if ($bq -and $bq.gemini5h -gt 5 -and $bq.geminiWeekly -gt 5) {
                                    $hasProfile = $false
                                    foreach ($pd in $existingProfiles) {
                                        if ($pd.Name -like "*$k*") { $hasProfile = $true; break }
                                        $st = Join-Path $pd.FullName "app_storage.json"
                                        if (Test-Path $st) {
                                            try {
                                                $u = (Get-Content $st -Raw | ConvertFrom-Json).'jetski.onboarding.lastLoginUsername'
                                                if ($u -and $u -like "*$k*") { $hasProfile = $true; break }
                                            } catch {}
                                        }
                                        $cr = Join-Path $pd.FullName "credential.json"
                                        if (Test-Path $cr) {
                                            try {
                                                $u = (Get-Content $cr -Raw | ConvertFrom-Json).email
                                                if ($u -and $u -like "*$k*") { $hasProfile = $true; break }
                                            } catch {}
                                        }
                                    }
                                    if ($hasProfile) {
                                        $minQuota = [math]::Min([int]$bq.gemini5h, [int]$bq.geminiWeekly)
                                        $candidates += [PSCustomObject]@{
                                            Account = $k
                                            MinQuota = $minQuota
                                        }
                                    }
                                }
                            }
                        }

                        $backupAcc = $null
                        if ($candidates.Count -gt 0) {
                            $backupAcc = ($candidates | Sort-Object -Property MinQuota -Descending)[0].Account
                        }

                        if ($backupAcc) {
                            $switchScript = "D:\ProjekAntigravity\Switch-AntigravityAccount.ps1"
                            $wmiArg = "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File `"$switchScript`" -TargetAccount `"$backupAcc`" -AutoMode"
                            Invoke-WmiMethod -Class Win32_Process -Name Create -ArgumentList $wmiArg | Out-Null

                            $instruction = "Lanjutkan pengerjaan task sebelumnya dari bagian yang belum selesai. Periksa kondisi file terakhir di proyek dan tuntaskan seluruh implementasinya."
                            Set-Content -Path "D:\ProjekAntigravity\LAST_RESUME_PROMPT.txt" -Value $instruction -Force -Encoding UTF8
                            try { [System.Windows.Clipboard]::SetText($instruction) } catch {
                                try { Set-Clipboard -Value $instruction } catch {
                                    try { cmd.exe /c "type D:\ProjekAntigravity\LAST_RESUME_PROMPT.txt | clip" } catch {}
                                }
                            }

                            if ($script:notifyIcon) {
                                $script:notifyIcon.ShowBalloonTip(7000, "Quota Habis - Auto Switcher", "Quota $activeUser habis (0%). Otomatis beralih ke $backupAcc!`nPrompt resume otomatis dikirimkan ke Antigravity.", [System.Windows.Forms.ToolTipIcon]::Warning)
                            }
                        }
                    }
                }
            } else {
                $script:firstExhaustedTime = $null
            }

            if ($quotaResetTriggered) {
                Save-AccountsRegistry $registry
                Sync-LiveAccountData
            }
        }
    } catch {}
}

# 7. Background Sync
function Sync-LiveAccountData {
    if ($script:isSyncing) { return }
    $script:isSyncing = $true
    try {
        $liveEmail = Get-LiveActiveUserEmail
        if (-not $liveEmail) {
            $rootStorage = "C:\Users\edvan\AppData\Roaming\Antigravity\app_storage.json"
            if (Test-Path $rootStorage) {
                try {
                    $content = Get-Content $rootStorage -Raw
                    if ($content -match '"jetski\.onboarding\.lastLoginUsername":\s*"([^"]+)"') {
                        $liveEmail = $matches[1]
                    }
                } catch {}
            }
        }
        if (-not $liveEmail) {
            $liveEmail = if ($script:currentActiveUser) { $script:currentActiveUser } else { "edvanwlf" }
        }

        $activeUser = Format-CleanUsername $liveEmail
        if ($script:currentActiveUser -and $script:currentActiveUser -ne $activeUser) {
            $script:lastAutoSwitchAttempt = $null
            $script:firstExhaustedTime = $null
        }
        $script:currentActiveUser = $activeUser

        $registry = Get-AccountsRegistry
        if (-not $registry.Contains($activeUser)) {
            $baselineMap = [ordered]@{}
            $storage = "C:\Users\edvan\AppData\Roaming\Antigravity\app_storage.json"
            if (Test-Path $storage) {
                try {
                    $sJson = [System.IO.File]::ReadAllText($storage) | ConvertFrom-Json
                    $sJson.PSObject.Properties | 
                        Where-Object { $_.Name -like "antigravity-multi-conversation-layout-v3-*" -and $_.Name -notlike "*index*" } | 
                        ForEach-Object { 
                            $cid = $_.Name.Replace("antigravity-multi-conversation-layout-v3-", "").Trim()
                            if ($cid) {
                                $cStats = Get-TranscriptStatsById $cid
                                if ($cStats) {
                                    $baselineMap[$cid] = [PSCustomObject]@{
                                        In    = [int64]$cStats.In
                                        Out   = [int64]$cStats.Out
                                        Cache = [int64]$cStats.Cache
                                    }
                                }
                            }
                        }
                } catch {}
            }

            $registry[$activeUser] = [PSCustomObject]@{
                accountName  = $activeUser
                email        = if ($liveEmail -match '@') { $liveEmail } else { "$activeUser@gmail.com" }
                lastSeen     = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                tokens       = [PSCustomObject]@{ Total = 0; Input = 0; Output = 0; Cache = 0; Conversations = 0 }
                convBaseline = $baselineMap
                knownConvIds = @()
                quota        = [PSCustomObject]@{
                    geminiWeekly         = 100
                    geminiWeeklyReset    = "Fresh Quota"
                    geminiWeeklyResetIso = $null
                    gemini5h             = 100
                    gemini5hReset        = "Fresh Quota"
                    gemini5hResetIso     = $null
                    claudeWeekly         = 100
                    claudeWeeklyResetIso = $null
                    claude5h             = 100
                    claude5hResetIso     = $null
                }
            }
        }

        $liveQuotaData = Get-RealtimeQuota
        if ($liveQuotaData) {
            $now = [DateTime]::UtcNow
            $geminiGroup = $liveQuotaData.groups | Where-Object { $_.displayName -like "*Gemini*" } | Select-Object -First 1
            if ($geminiGroup) {
                # Weekly Bucket
                $wB = $geminiGroup.buckets | Where-Object { $_.window -eq "weekly" -or $_.bucketId -like "*weekly*" } | Select-Object -First 1
                if ($wB) {
                    $wIso = $wB.resetTime
                    $isExpiredW = $false
                    if (-not [string]::IsNullOrWhiteSpace($wIso)) {
                        try {
                            $tw = [DateTime]::Parse($wIso).ToUniversalTime()
                            if (($tw - $now).TotalSeconds -le 0) { $isExpiredW = $true }
                        } catch {}
                    }
                    $wPct = [math]::Min(100, [math]::Max(0, [int][math]::Round([double]$wB.remainingFraction * 100, [System.MidpointRounding]::AwayFromZero)))
                    if ($wPct -ge 100 -or $isExpiredW) {
                        $registry[$activeUser].quota.geminiWeekly = 100
                        $registry[$activeUser].quota.geminiWeeklyReset = "Ready / Full"
                        $registry[$activeUser].quota.geminiWeeklyResetIso = $null
                    } else {
                        $registry[$activeUser].quota.geminiWeekly = $wPct
                        $registry[$activeUser].quota.geminiWeeklyReset = Format-ResetTime $wIso
                        $registry[$activeUser].quota.geminiWeeklyResetIso = $wIso
                    }
                }

                # 5-Hour Bucket
                $fB = $geminiGroup.buckets | Where-Object { $_.window -eq "5h" -or $_.bucketId -like "*5h*" } | Select-Object -First 1
                if ($fB) {
                    $fIso = $fB.resetTime
                    $isExpiredF = $false
                    if (-not [string]::IsNullOrWhiteSpace($fIso)) {
                        try {
                            $tf = [DateTime]::Parse($fIso).ToUniversalTime()
                            if (($tf - $now).TotalSeconds -le 0) { $isExpiredF = $true }
                        } catch {}
                    }
                    $fPct = [math]::Min(100, [math]::Max(0, [int][math]::Round([double]$fB.remainingFraction * 100, [System.MidpointRounding]::AwayFromZero)))
                    if ($fPct -ge 100 -or $isExpiredF) {
                        $registry[$activeUser].quota.gemini5h = 100
                        $registry[$activeUser].quota.gemini5hReset = "Ready / Full"
                        $registry[$activeUser].quota.gemini5hResetIso = $null
                    } else {
                        $registry[$activeUser].quota.gemini5h = $fPct
                        $registry[$activeUser].quota.gemini5hReset = Format-ResetTime $fIso
                        $registry[$activeUser].quota.gemini5hResetIso = $fIso
                    }
                }
            }

            # Claude Group
            $claudeGroup = $liveQuotaData.groups | Where-Object { $_.displayName -like "*Claude*" -or $_.displayName -like "*3p*" } | Select-Object -First 1
            if ($claudeGroup) {
                $wB = $claudeGroup.buckets | Where-Object { $_.window -eq "weekly" -or $_.bucketId -like "*weekly*" } | Select-Object -First 1
                if ($wB) {
                    $wIso = $wB.resetTime
                    $isExpiredW = $false
                    if (-not [string]::IsNullOrWhiteSpace($wIso)) {
                        try {
                            $tw = [DateTime]::Parse($wIso).ToUniversalTime()
                            if (($tw - $now).TotalSeconds -le 0) { $isExpiredW = $true }
                        } catch {}
                    }
                    $wPct = [math]::Min(100, [math]::Max(0, [int][math]::Round([double]$wB.remainingFraction * 100, [System.MidpointRounding]::AwayFromZero)))
                    if ($wPct -ge 100 -or $isExpiredW) {
                        $registry[$activeUser].quota.claudeWeekly = 100
                        $registry[$activeUser].quota.claudeWeeklyResetIso = $null
                    } else {
                        $registry[$activeUser].quota.claudeWeekly = $wPct
                        $registry[$activeUser].quota.claudeWeeklyResetIso = $wIso
                    }
                }
                $fB = $claudeGroup.buckets | Where-Object { $_.window -eq "5h" -or $_.bucketId -like "*5h*" } | Select-Object -First 1
                if ($fB) {
                    $fIso = $fB.resetTime
                    $isExpiredF = $false
                    if (-not [string]::IsNullOrWhiteSpace($fIso)) {
                        try {
                            $tf = [DateTime]::Parse($fIso).ToUniversalTime()
                            if (($tf - $now).TotalSeconds -le 0) { $isExpiredF = $true }
                        } catch {}
                    }
                    $fPct = [math]::Min(100, [math]::Max(0, [int][math]::Round([double]$fB.remainingFraction * 100, [System.MidpointRounding]::AwayFromZero)))
                    if ($fPct -ge 100 -or $isExpiredF) {
                        $registry[$activeUser].quota.claude5h = 100
                        $registry[$activeUser].quota.claude5hResetIso = $null
                    } else {
                        $registry[$activeUser].quota.claude5h = $fPct
                        $registry[$activeUser].quota.claude5hResetIso = $fIso
                    }
                }
            }
        }

        $activeTokens = Get-ActiveAccountTokens -user $activeUser
        if ($activeTokens) {
            $existingTokens = $registry[$activeUser].tokens
            $curIn    = if ($existingTokens -and $existingTokens.Input) { [int64]$existingTokens.Input } else { [int64]0 }
            $curOut   = if ($existingTokens -and $existingTokens.Output) { [int64]$existingTokens.Output } else { [int64]0 }
            $curCache = if ($existingTokens -and $existingTokens.Cache) { [int64]$existingTokens.Cache } else { [int64]0 }
            $curConvs = if ($existingTokens -and $existingTokens.Conversations) { [int]$existingTokens.Conversations } else { 0 }

            $actIn    = [int64]$activeTokens.Input
            $actOut   = [int64]$activeTokens.Output
            $actCache = [int64]$activeTokens.Cache
            $actConvs = [int]$activeTokens.Conversations

            # PROTEKSI MONOTONIK: Token & Percakapan TIDAK BOLEH BERKURANG / RESET saat ganti akun atau tutup tab
            $newIn    = [Math]::Max($curIn, $actIn)
            $newOut   = [Math]::Max($curOut, $actOut)
            $newCache = [Math]::Max($curCache, $actCache)
            $newConvs = [Math]::Max($curConvs, $actConvs)
            $newTotal = $newIn + $newOut

            $registry[$activeUser].tokens = [PSCustomObject]@{
                Conversations = $newConvs
                Input         = $newIn
                Output        = $newOut
                Cache         = $newCache
                Total         = $newTotal
            }
            if ($activeTokens.ConvIds -and $activeTokens.ConvIds.Count -gt 0) {
                $combinedIds = @($activeTokens.ConvIds)
                if ($registry[$activeUser].knownConvIds) {
                    $combinedIds = @($combinedIds + @($registry[$activeUser].knownConvIds)) | Sort-Object -Unique
                }
                $registry[$activeUser] | Add-Member -MemberType NoteProperty -Name "knownConvIds" -Value $combinedIds -Force
            }
        }
        $registry[$activeUser].lastSeen = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

        Save-AccountsRegistry $registry
        $script:currentRegistry = $registry
        Update-WidgetView
    } catch {}
    finally {
        $script:isSyncing = $false
    }
}

function Clean-OrphanRobloxProcesses {
    try {
        $robloxProcs = Get-Process -Name "RobloxStudioBeta", "RobloxCrashHandler" -ErrorAction SilentlyContinue
        foreach ($proc in $robloxProcs) {
            $uptime = ((Get-Date) - $proc.StartTime).TotalSeconds
            if ($uptime -gt 15) {
                $hasWin = [RobloxGuard]::HasActiveOrMinimizedWindow($proc.Id)
                if (-not $hasWin) {
                    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {}
}

# Timer 1 Detik untuk Countdown Realtime & Instant 00:00 Reset Detection
$script:countdownTimer = New-Object System.Windows.Threading.DispatcherTimer
$script:countdownTimer.Interval = [TimeSpan]::FromSeconds(1)
$script:countdownTimer.Add_Tick({ Update-RealtimeCountdownTick })
$script:countdownTimer.Start()

# Timer 50ms (20 FPS) untuk Gerakan Rotasi Garis System Tray yang Super Mulus Tanpa Patah-Patah
$script:trayAnimTimer = New-Object System.Windows.Threading.DispatcherTimer
$script:trayAnimTimer.Interval = [TimeSpan]::FromMilliseconds(50)
$script:trayAnimTimer.Add_Tick({ Update-TrayAnimationTick })
$script:trayAnimTimer.Start()

# Timer 15 Detik untuk Sinkronisasi Background dengan Language Server & Orphan Cleaner
$script:syncTimer = New-Object System.Windows.Threading.DispatcherTimer
$script:syncTimer.Interval = [TimeSpan]::FromSeconds(15)
$script:syncTimer.Add_Tick({ 
    Sync-LiveAccountData
    Clean-OrphanRobloxProcesses
})
$script:syncTimer.Start()

# Inisialisasi Awal
$initStorage = "C:\Users\edvan\AppData\Roaming\Antigravity\app_storage.json"
$initUser = "edvanwlf"
if (Test-Path $initStorage) {
    try {
        $initContent = Get-Content $initStorage -Raw
        if ($initContent -match '"jetski\.onboarding\.lastLoginUsername":\s*"([^"]+)"') {
            $initUser = Format-CleanUsername $matches[1]
        }
    } catch {}
}
$script:currentRegistry   = Get-AccountsRegistry
$script:currentActiveUser = $initUser
$script:selectedProfile   = $initUser
if ($script:currentRegistry.Contains($initUser) -and $script:currentRegistry[$initUser].tokens) {
    $script:cachedActiveTokens = $script:currentRegistry[$initUser].tokens
    $script:lastTokenScan = Get-Date
}
Update-WidgetView
Sync-LiveAccountData

$script:app = [System.Windows.Application]::Current
if (-not $script:app) {
    $script:app = New-Object System.Windows.Application
}
$script:app.ShutdownMode = [System.Windows.ShutdownMode]::OnExplicitShutdown
$window.Show()
if (-not $script:isPinned) {
    try {
        $helper = New-Object System.Windows.Interop.WindowInteropHelper($window)
        if ($helper.Handle -ne [IntPtr]::Zero) {
            [Win32.WinAPI]::SetWindowPos($helper.Handle, [IntPtr]1, 0, 0, 0, 0, 0x0002 -bor 0x0001 -bor 0x0010)
        }
    } catch {}
}
$script:app.Run($window) | Out-Null
