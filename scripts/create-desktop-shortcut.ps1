$WshShell = New-Object -ComObject WScript.Shell
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath 'Brianna Heavy Equipment.lnk'
$targetExe = 'C:\Users\Harold\Documents\Proyectos\Brianna Heavy\release\win-unpacked\Brianna Heavy Equipment.exe'
$iconPath = 'C:\Users\Harold\Documents\Proyectos\Brianna Heavy\build\icon.ico'

$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetExe
$shortcut.WorkingDirectory = 'C:\Users\Harold\Documents\Proyectos\Brianna Heavy\release\win-unpacked'
$shortcut.IconLocation = "$iconPath,0"
$shortcut.Description = 'Brianna Heavy Equipment - Facturación y Gestión POS'
$shortcut.Save()

Write-Host "Desktop shortcut created successfully at: $shortcutPath"
