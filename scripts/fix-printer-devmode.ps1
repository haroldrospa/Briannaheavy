# Script to fix 4BARCODE 4B-2074B DevModePerUser
$devModes2 = (Get-ItemProperty -Path 'HKCU:\Printers\DevModes2').'4BARCODE 4B-2074B'
if ($devModes2) {
    Set-ItemProperty -Path 'HKCU:\Printers\DevModePerUser' -Name '4BARCODE 4B-2074B' -Value $devModes2
    Write-Output "Successfully copied Nuevo material DevMode into DevModePerUser."
} else {
    Write-Output "DevModes2 entry not found."
}
