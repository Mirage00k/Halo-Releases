param([string]$a,[string]$par)
if($a -eq 'start'){
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.SendKeys]::SendWait('^{ESC}')
  exit
}
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class TB {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int l, t, r, b; }
  [StructLayout(LayoutKind.Sequential)] public struct APPBARDATA { public int cbSize; public IntPtr hWnd; public uint uCallbackMessage; public uint uEdge; public RECT rc; public IntPtr lParam; }
  [DllImport("shell32.dll")] static extern IntPtr SHAppBarMessage(uint m, ref APPBARDATA d);
  [DllImport("user32.dll")] static extern IntPtr FindWindow(string c, string w);
  [DllImport("user32.dll")] static extern IntPtr FindWindowEx(IntPtr p, IntPtr a, string c, string w);
  [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr h, int n);
  public static void Autohide(bool on) {
    APPBARDATA d = new APPBARDATA(); d.cbSize = Marshal.SizeOf(d);
    d.hWnd = FindWindow("Shell_TrayWnd", null);
    d.lParam = (IntPtr)(on ? 1 : 2);
    SHAppBarMessage(0xA, ref d);
  }
  public static void Tray(int n) {
    foreach (string c in new string[] { "Shell_TrayWnd", "Shell_SecondaryTrayWnd" }) {
      IntPtr h = IntPtr.Zero;
      while ((h = FindWindowEx(IntPtr.Zero, h, c, null)) != IntPtr.Zero) ShowWindow(h, n);
    }
  }
}
'@
if($a -eq 'hide'){
  [TB]::Autohide($true)
  $i = 0
  while($true){
    [TB]::Tray(0)
    Start-Sleep -Milliseconds 200
    $i++
    if($par -and ($i % 10 -eq 0) -and -not (Get-Process -Id ([int]$par) -ErrorAction SilentlyContinue)){ [TB]::Autohide($false); [TB]::Tray(5); exit }
  }
} else {
  [TB]::Autohide($false); [TB]::Tray(5)
}