$ErrorActionPreference='SilentlyContinue'
Add-Type -AssemblyName System.Drawing
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
# processus persistant : reçoit un chemin (UTF-8 en base64) par ligne, répond "<base64 chemin> <png en base64>"
while(($l=[Console]::In.ReadLine()) -ne $null){
  $k=$l.Trim(); if(-not $k){continue}
  $out=''
  try{
    $p=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($k))
    $ic=[System.Drawing.Icon]::ExtractAssociatedIcon($p)
    if($ic){
      $bm=$ic.ToBitmap(); $ms=New-Object IO.MemoryStream
      $bm.Save($ms,[Drawing.Imaging.ImageFormat]::Png)
      $out=[Convert]::ToBase64String($ms.ToArray())
      $bm.Dispose(); $ms.Dispose(); $ic.Dispose()
    }
  }catch{}
  [Console]::WriteLine("$k $out")
}