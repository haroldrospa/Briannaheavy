# Search HKCU and HKLM for 'Laboratorios'
Write-Output "Searching HKCU for Laboratorios..."
Get-ChildItem -Path "HKCU:\Printers" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $item = $_
    $item.Property | ForEach-Object {
        $prop = $_
        $val = $item.GetValue($prop)
        if ($val -is [string] -and $val -like "*Laboratorios*") {
            Write-Output "Found in $($item.Name) : $prop = $val"
        } elseif ($val -is [byte[]]) {
            $str = [System.Text.Encoding]::Unicode.GetString($val)
            if ($str -like "*Laboratorios*") {
                Write-Output "Found in $($item.Name) : $prop (Binary contains Laboratorios)"
            }
        }
    }
}

Get-ChildItem -Path "HKCU:\Software\Seagull Scientific" -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $item = $_
    $item.Property | ForEach-Object {
        $prop = $_
        $val = $item.GetValue($prop)
        if ($val -is [string] -and $val -like "*Laboratorios*") {
            Write-Output "Found in Seagull HKCU $($item.Name) : $prop = $val"
        }
    }
}
