$ErrorActionPreference='SilentlyContinue'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject {}
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int EnumAudioEndpoints(int f, int s, out IntPtr d); int GetDefaultAudioEndpoint(int f, int r, out IMMDevice d); }
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid id, int ctx, IntPtr p, [MarshalAs(UnmanagedType.IUnknown)] out object o); }
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int RegisterControlChangeNotify(IntPtr p); int UnregisterControlChangeNotify(IntPtr p); int GetChannelCount(out uint c);
  int SetMasterVolumeLevel(float l, ref Guid g); int SetMasterVolumeLevelScalar(float l, ref Guid g);
  int GetMasterVolumeLevel(out float l); int GetMasterVolumeLevelScalar(out float l);
  int SetChannelVolumeLevel(uint n, float l, ref Guid g); int SetChannelVolumeLevelScalar(uint n, float l, ref Guid g);
  int GetChannelVolumeLevel(uint n, out float l); int GetChannelVolumeLevelScalar(uint n, out float l);
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool m, ref Guid g); int GetMute(out bool m);
}
public class Vol {
  static IAudioEndpointVolume Ep() {
    IMMDeviceEnumerator e = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
    IMMDevice d; e.GetDefaultAudioEndpoint(0, 1, out d);
    Guid g = typeof(IAudioEndpointVolume).GUID; object o; d.Activate(ref g, 23, IntPtr.Zero, out o);
    return (IAudioEndpointVolume)o;
  }
  public static int Get() { float v; Ep().GetMasterVolumeLevelScalar(out v); return (int)Math.Round(v * 100); }
  public static bool Muted() { bool m; Ep().GetMute(out m); return m; }
  public static void Set(int p) { Guid g = Guid.Empty; Ep().SetMasterVolumeLevelScalar(Math.Max(0, Math.Min(100, p)) / 100f, ref g); }
  public static void Mute(bool m) { Guid g = Guid.Empty; Ep().SetMute(m, ref g); }
}
'@
$ev=[System.Text.RegularExpressions.MatchEvaluator]{ param($m) ('\u{0:x4}' -f [int][char]$m.Value[0]) }
function Emit($t,$o){ $j=ConvertTo-Json -InputObject $o -Compress -Depth 4; $j=[regex]::Replace($j,'[^\x00-\x7F]',$ev); [Console]::WriteLine("$t $j") }
$self=''
while(($l=[Console]::In.ReadLine()) -ne $null){
  $x=$l.Trim() -split ' ',2; $arg=$x[1]
  try{
    switch($x[0]){
      'self' { $self=$arg }
      'vol' { Emit 'vol' @{ v=[Vol]::Get(); m=[Vol]::Muted() } }
      'setvol' { [Vol]::Set([int]$arg) }
      'mute' { [Vol]::Mute($arg -eq '1') }
      'wifi' {
        $ssid=''; $sig=0
        foreach($ln in @(netsh wlan show interfaces)){
          if($ln -match '^\s*SSID\s*:\s*(.+)$'){ $ssid=$Matches[1].Trim() }
          elseif($ln -match ':\s*(\d+)%'){ $sig=[int]$Matches[1] }
        }
        $nics=[Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()
        $eth=[bool]($nics | Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -eq 'Ethernet' })
        Emit 'wifi' @{ ssid=$ssid; sig=$sig; eth=$eth; up=[Net.NetworkInformation.NetworkInterface]::GetIsNetworkAvailable() }
      }
      'wifilist' {
        $known=@{}
        foreach($ln in @(netsh wlan show profiles)){ if($ln -match '^\s+\S.*?\s:\s(.+)$'){ $known[$Matches[1].Trim()]=$true } }
        $best=@{}; $cur=''
        foreach($ln in @(netsh wlan show networks mode=bssid)){
          if($ln -match '^\s*SSID\s+\d+\s*:\s*(.*)$'){ $cur=$Matches[1].Trim(); if($cur -and -not $best.ContainsKey($cur)){ $best[$cur]=0 } }
          elseif($cur -and $ln -match ':\s*(\d+)%'){ $v=[int]$Matches[1]; if($v -gt $best[$cur]){ $best[$cur]=$v } }
        }
        $r=@($best.Keys | ForEach-Object { [pscustomobject]@{ s=$_; g=$best[$_]; k=[bool]$known[$_] } } | Sort-Object g -Descending | Select-Object -First 12)
        Emit 'wifilist' $r
      }
      'wificonn' {
        $s=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($arg))
        netsh wlan connect name="$s" ssid="$s" | Out-Null
      }
      'bg' {
        $win=$env:windir
        $r=@(Get-Process | Where-Object { $_.MainWindowHandle -eq 0 -and $_.Path -and -not $_.Path.StartsWith($win,[StringComparison]::OrdinalIgnoreCase) -and $_.Path -ne $self -and $_.ProcessName -notmatch '^(powershell|pwsh|conhost|node|electron|WindowsTerminal|OpenConsole)$' } | Group-Object Path | ForEach-Object { [pscustomobject]@{ n=$_.Group[0].ProcessName; p=$_.Name } } | Sort-Object n | Select-Object -First 32)
        Emit 'bg' $r
      }
    }
  }catch{}
}