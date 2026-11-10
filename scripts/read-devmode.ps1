$bytes = (Get-ItemProperty -Path 'HKCU:\Printers\DevModes2').'4BARCODE 4B-2074B'
if ($bytes) {
    # dmDeviceName is bytes 0..63
    $deviceName = [System.Text.Encoding]::Unicode.GetString($bytes[0..63]).Trim([char]0)
    # dmFormName is bytes 102..165
    $formName = [System.Text.Encoding]::Unicode.GetString($bytes[102..165]).Trim([char]0)
    $paperSize = [BitConverter]::ToInt16($bytes, 78)
    $paperLength = [BitConverter]::ToInt16($bytes, 80)
    $paperWidth = [BitConverter]::ToInt16($bytes, 82)
    
    [PSCustomObject]@{
        DeviceName = $deviceName
        FormName = $formName
        PaperSizeCode = $paperSize
        PaperLength = $paperLength
        PaperWidth = $paperWidth
    }
}
