$ErrorActionPreference='SilentlyContinue'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class WK {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte sc, uint fl, UIntPtr ex);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int l, t, r, b; }
  [StructLayout(LayoutKind.Sequential)] public struct APPBARDATA { public int cbSize; public IntPtr hWnd; public uint uCallbackMessage; public uint uEdge; public RECT rc; public IntPtr lParam; }
  [DllImport("shell32.dll")] static extern IntPtr SHAppBarMessage(uint m, ref APPBARDATA d);
  [DllImport("user32.dll")] static extern IntPtr FindWindow(string c, string w);
  [DllImport("user32.dll")] static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string w);
  static void Autohide(bool on) {
    APPBARDATA d = new APPBARDATA(); d.cbSize = Marshal.SizeOf(d);
    d.hWnd = FindWindow("Shell_TrayWnd", null);
    d.lParam = (IntPtr)(on ? 1 : 2);
    SHAppBarMessage(0xA, ref d);
  }
  static void Tray(int n) {
    foreach (string c in new string[] { "Shell_TrayWnd", "Shell_SecondaryTrayWnd" }) {
      IntPtr h = IntPtr.Zero;
      while ((h = FindWindowEx(IntPtr.Zero, h, c, null)) != IntPtr.Zero) ShowWindow(h, n);
    }
  }
  // la barre Windows est re-masquée en continu par un timer natif (explorer la réaffiche au survol du bord bas)
  static System.Threading.Timer tm;
  public static void Hide() { Autohide(true); Tray(0); if (tm == null) tm = new System.Threading.Timer(delegate(object o) { Tray(0); }, null, 120, 120); }
  public static void Show() { if (tm != null) { tm.Dispose(); tm = null; } Autohide(false); Tray(5); }
  public static void Tap(byte vk) { keybd_event(vk, 0, 0, UIntPtr.Zero); keybd_event(vk, 0, 2, UIntPtr.Zero); }
}
'@
# processus persistant : évite de relancer PowerShell (~0,5 s) à chaque clic
while(($l=[Console]::In.ReadLine()) -ne $null){
  $x=$l.Trim() -split ' '
  switch($x[0]){
    'start' { [WK]::Tap(0x5B) }
    'hide' { [WK]::Hide() }
    'show' { [WK]::Show() }
    'focus' {
      $hw=[IntPtr][int64]$x[1]
      if([WK]::IsIconic($hw)){[void][WK]::ShowWindow($hw,9)}
      if(-not [WK]::SetForegroundWindow($hw)){
        [WK]::Tap(0x12)
        if(-not [WK]::SetForegroundWindow($hw)){ (New-Object -ComObject WScript.Shell).AppActivate([int]$x[2]) | Out-Null }
      }
    }
  }
}
# le parent est mort (stdin fermé) : on rend la barre Windows
[WK]::Show()