$cfg = Get-PrintConfiguration -PrinterName "4BARCODE 4B-2074B"
[xml]$ticket = $cfg.PrintTicketXML
$ticket.PrintTicket.Feature | ForEach-Object {
    [PSCustomObject]@{
        Feature = $_.name
        Option = $_.Option.name
        StockName = $_.Option.Property.Value
    }
}
