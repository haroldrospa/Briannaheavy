$bytes = (Get-ItemProperty -Path 'HKLM:\System\CurrentControlSet\Control\Print\Printers\4BARCODE 4B-2074B').'Default DevMode'
if ($bytes) {
    $deviceName = [System.Text.Encoding]::Unicode.GetString($bytes[0..63]).Trim([char]0)
    $formName = [System.Text.Encoding]::Unicode.GetString($bytes[102..165]).Trim([char]0)
    $paperSize = [BitConverter]::ToInt16($bytes, 78)
    $paperLength = [BitConverter]::ToInt16($bytes, 80)
    $paperWidth = [BitConverter]::ToInt16($bytes, 82)
    
    [PSCustomObject]@{
        Location = "HKLM Default DevMode"
        DeviceName = $deviceName
        FormName = $formName
        PaperSizeCode = $paperSize
        PaperLength = $paperLength
        PaperWidth = $paperWidth
    }
}
