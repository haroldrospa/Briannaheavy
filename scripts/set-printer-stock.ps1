# Script to set default paper size to 'Nuevo material' for 4BARCODE 4B-2074B
$printerName = "4BARCODE 4B-2074B"

# 1. Update PrintTicket to Nuevo material
$cfg = Get-PrintConfiguration -PrinterName $printerName
[xml]$ticket = $cfg.PrintTicketXML

# Find PageMediaSize feature
$feature = $ticket.PrintTicket.Feature | Where-Object { $_.name -eq 'psk:PageMediaSize' }
if ($feature) {
    $feature.Option.name = 'seagull:StockNuevomaterial'
    $feature.Option.ScoredProperty | Where-Object { $_.name -eq 'psk:MediaSizeWidth' } | ForEach-Object { $_.Value = '30000' }
    $feature.Option.ScoredProperty | Where-Object { $_.name -eq 'psk:MediaSizeHeight' } | ForEach-Object { $_.Value = '20000' }
    $feature.Option.Property | Where-Object { $_.name -eq 'seagull:StockName' } | ForEach-Object { $_.Value = 'Nuevo material' }
    
    $cfg.PrintTicketXML = $ticket.OuterXml
    Set-PrintConfiguration -InputObject $cfg -Verbose
}

Write-Output "Print Configuration updated."
