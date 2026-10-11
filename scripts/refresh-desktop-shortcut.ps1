$WshShell = New-Object -ComObject WScript.Shell
$lnkPath = "C:\Users\edvan\Desktop\ENCross.lnk"
if (Test-Path $lnkPath) {
    $Shortcut = $WshShell.CreateShortcut($lnkPath)
    $Shortcut.IconLocation = "D:\ProjekAntigravity\vancross\desktop\assets\icon.ico,0"
    $Shortcut.Save()
    Write-Output "Refreshed Desktop shortcut icon successfully!"
} else {
    Write-Output "Desktop shortcut not found, skipping."
}
