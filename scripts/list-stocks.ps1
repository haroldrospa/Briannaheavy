$cfg = Get-PrintConfiguration -PrinterName "4BARCODE 4B-2074B"
[xml]$caps = $cfg.PrintCapabilitiesXML
$pageMediaFeature = $caps.PrintCapabilities.Feature | Where-Object { $_.name -eq 'psk:PageMediaSize' }
$pageMediaFeature.Option | ForEach-Object {
    [PSCustomObject]@{
        OptionName = $_.name
        StockName = ($_.Property | Where-Object { $_.name -eq 'seagull:StockName' }).Value.'#text'
        Width = ($_.ScoredProperty | Where-Object { $_.name -eq 'psk:MediaSizeWidth' }).Value.'#text'
        Height = ($_.ScoredProperty | Where-Object { $_.name -eq 'psk:MediaSizeHeight' }).Value.'#text'
        DisplayName = ($_.Property | Where-Object { $_.name -eq 'psk:DisplayName' }).Value.'#text'
    }
}
