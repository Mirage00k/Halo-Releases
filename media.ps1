[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.DataReader,Windows.Storage.Streams,ContentType=WindowsRuntime]
$asTask=([System.WindowsRuntimeSystemExtensions].GetMethods()|?{$_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'})[0]
function Await($op,$t){$m=$asTask.MakeGenericMethod($t);$k=$m.Invoke($null,@($op));$k.Wait(-1)|Out-Null;$k.Result}
$PropT=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties]
function GetCover($p){
  try{
    $ref=$p.Thumbnail; if(-not $ref){return ''}
    $st=Await ($ref.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    if(-not $st -or $st.Size -eq 0){return ''}
    $mime=if($st.ContentType){$st.ContentType}else{'image/jpeg'}
    $bytes=$null
    try{
      $len=[uint32]$st.Size
      $dr=New-Object Windows.Storage.Streams.DataReader($st.GetInputStreamAt(0))
      $null=Await ($dr.LoadAsync($len)) ([uint32])
      $bytes=New-Object byte[] $len; $dr.ReadBytes($bytes); $dr.Dispose()
    }catch{$bytes=$null}
    if(-not $bytes -or $bytes.Length -eq 0){
      try{
        $net=[System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($st)
        $ms=New-Object System.IO.MemoryStream; $net.CopyTo($ms); $net.Dispose()
        $bytes=$ms.ToArray()
      }catch{}
    }
    try{$st.Dispose()}catch{}
    if(-not $bytes -or $bytes.Length -eq 0){return ''}
    return "data:$mime;base64,"+[Convert]::ToBase64String($bytes)
  }catch{}
  return ''
}
$mgr=Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

# --- Seules les sessions Spotify / Deezer sont prises en compte (sinon : rien n'est affiché) ---
function GetSess{
  try{
    $f=@($mgr.GetSessions()|?{$_.SourceAppUserModelId -match 'spotify|deezer'})
    if(-not $f.Count){return $null}
    foreach($x in $f){if($x.GetPlaybackInfo().PlaybackStatus -eq 'Playing'){return $x}}
    return $f[0]
  }catch{return $null}
}
# --- Pochette, technique n°2 et n°3 : API publique Deezer puis iTunes (recherche artiste + titre) ---
function Fetch($url){
  try{$w=New-Object System.Net.WebClient;$w.Headers['User-Agent']='GlassDock';return $w.DownloadData($url)}catch{return $null}
}
function WebCover($title,$artist){
  try{
    [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
    $img=$null
    foreach($q in @("artist:`"$artist`" track:`"$title`"","$artist $title")){
      $e=[Uri]::EscapeDataString($q)
      $b=Fetch "https://api.deezer.com/search?q=$e&limit=1"
      if($b){$j=[Text.Encoding]::UTF8.GetString($b)|ConvertFrom-Json;$u=$j.data[0].album.cover_big;if($u){$img=Fetch $u}}
      if($img){break}
    }
    if(-not $img){
      $e=[Uri]::EscapeDataString("$artist $title")
      $b=Fetch "https://itunes.apple.com/search?term=$e&entity=song&limit=1"
      if($b){$j=[Text.Encoding]::UTF8.GetString($b)|ConvertFrom-Json;$u=$j.results[0].artworkUrl100;if($u){$img=Fetch ($u -replace '100x100','600x600')}}
    }
    if($img -and $img.Length -gt 0){return 'data:image/jpeg;base64,'+[Convert]::ToBase64String($img)}
  }catch{}
  return ''
}

# --- Commande ponctuelle : media.ps1 toggle|next|prev ---
if($args[0] -and $args[0] -ne 'loop'){
  $s=GetSess; if(-not $s){exit}
  switch($args[0]){'toggle'{$null=Await ($s.TryTogglePlayPauseAsync()) ([bool])}'next'{$null=Await ($s.TrySkipNextAsync()) ([bool])}'prev'{$null=Await ($s.TrySkipPreviousAsync()) ([bool])}}
  exit
}

# --- Mode persistant : media.ps1 loop  (une ligne JSON toutes les 2 s) ---
# La pochette (base64, lourde) n'est envoyée qu'au changement de piste, pas à chaque ligne.
$lastKey='';$needCover=$false;$tries=0
while($true){
  try{
    $s=GetSess
    if(-not $s){$lastKey='';[Console]::WriteLine('{}')}
    else{
      $p=Await ($s.TryGetMediaPropertiesAsync()) ($PropT)
      $key="$($p.Title)|$($p.Artist)"
      if($key -ne $lastKey){$lastKey=$key;$needCover=$true;$tries=0}
      $cover=''
      if($needCover){$cover=GetCover $p;if(-not $cover -and $tries -ge 1){$cover=WebCover $p.Title $p.Artist};$tries++;if($cover -or $tries -ge 15){$needCover=$false}}
      $t=$s.GetTimelineProperties()
      $o=[ordered]@{title=$p.Title;artist=$p.Artist;pos=$t.Position.TotalSeconds;dur=$t.EndTime.TotalSeconds;playing=($s.GetPlaybackInfo().PlaybackStatus -eq 'Playing')}
      if($cover){$o.cover=$cover}
      [Console]::WriteLine(($o|ConvertTo-Json -Compress))
    }
  }catch{}
  Start-Sleep -Seconds 2
}