param([string]$a,[string]$h,[string]$p)
$ErrorActionPreference='SilentlyContinue'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Text;
using System.Runtime.InteropServices;
public class WinInfo { public long h; public int pid; public string t; }
public class WN {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc p, IntPtr l);
  [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint c);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int i);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out int pid);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int a, out int v, int s);
  public static bool Cloaked(IntPtr h) { int v; DwmGetWindowAttribute(h, 14, out v, 4); return v != 0; }
  public static int FgPid() { int pid; GetWindowThreadProcessId(GetForegroundWindow(), out pid); return pid; }
  // toutes les fenêtres "de barre des tâches" (y compris plusieurs fenêtres d'un même processus, ex. l'Explorateur de fichiers)
  public static List<WinInfo> List() {
    List<WinInfo> r = new List<WinInfo>();
    EnumWindows(delegate(IntPtr h, IntPtr l) {
      if (!IsWindowVisible(h) || Cloaked(h)) return true;
      int len = GetWindowTextLength(h); if (len <= 0) return true;
      int ex = GetWindowLong(h, -20);
      bool tool = (ex & 0x80) != 0, app = (ex & 0x40000) != 0;
      if (tool && !app) return true;
      if (GetWindow(h, 4) != IntPtr.Zero && !app) return true;
      StringBuilder sb = new StringBuilder(len + 1); GetWindowText(h, sb, sb.Capacity);
      int pid; GetWindowThreadProcessId(h, out pid);
      WinInfo w = new WinInfo(); w.h = h.ToInt64(); w.pid = pid; w.t = sb.ToString(); r.Add(w);
      return true;
    }, IntPtr.Zero);
    return r;
  }
}
'@
if($a -eq 'focus'){
  $hw=[IntPtr][int64]$h
  if([WN]::IsIconic($hw)){[void][WN]::ShowWindow($hw,9)}
  if(-not [WN]::SetForegroundWindow($hw)){ (New-Object -ComObject WScript.Shell).AppActivate([int]$p) | Out-Null }
  exit
}
$cache=@{}; $last=''
while($true){
  try{
    if($cache.Count -gt 400){ $cache=@{} }
    $o=@([WN]::List() | ForEach-Object {
      $id=$_.pid
      if(-not $cache.ContainsKey($id)){
        $pr=Get-Process -Id $id -ErrorAction SilentlyContinue
        $cache[$id]=@{p=$pr.Path;n=$pr.ProcessName}
      }
      $c=$cache[$id]
      if($c.p){ [pscustomobject]@{pid=$id;h=$_.h;t=$_.t;p=$c.p;n=$c.n} }
    })
    $fp=[WN]::FgPid()
    $sig="$fp|"+((@($o|ForEach-Object{"$($_.h)"}) ) -join ',')
    # n'émet que lorsque quelque chose change (ouverture, fermeture, fenêtre active) : réactif sans spammer
    if($sig -ne $last){ $last=$sig; [Console]::WriteLine((@{fp=$fp;w=$o}|ConvertTo-Json -Compress -Depth 4)) }
  }catch{}
  Start-Sleep -Milliseconds 200
}