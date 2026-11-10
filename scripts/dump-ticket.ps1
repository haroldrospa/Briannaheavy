$cfg = Get-PrintConfiguration -PrinterName "4BARCODE 4B-2074B"
$cfg.PrintTicketXML | Out-File -FilePath "scripts/current-ticket.xml" -Encoding utf8
Write-Output "Saved scripts/current-ticket.xml"
