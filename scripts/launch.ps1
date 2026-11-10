$exe = "release\win-unpacked\Brianna Heavy Equipment.exe"
Start-Process -FilePath $exe
Start-Sleep -Seconds 2
Get-Process -Name "Brianna*" | Select-Object Id, ProcessName
