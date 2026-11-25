Option Explicit

Dim shell, fso, projectRoot, dataDir, nodeCheck, command, exePath
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
projectRoot = fso.GetParentFolderName(WScript.ScriptFullName)
dataDir = fso.BuildPath(projectRoot, "data")

If Not fso.FolderExists(dataDir) Then fso.CreateFolder(dataDir)

exePath = fso.BuildPath(projectRoot, "KeepaBuyer.exe")
If fso.FileExists(exePath) Then
  shell.Run """" & exePath & """", 1, False
  WScript.Quit 0
End If

On Error Resume Next
Set nodeCheck = shell.Exec("cmd.exe /d /s /c node --version")
If Err.Number <> 0 Then
  MsgBox "Per avviare Keepa Buyer serve Node.js 20 o superiore. Dopo averlo installato, fai doppio clic di nuovo su questo file.", vbExclamation, "Keepa Buyer"
  WScript.Quit 1
End If
On Error GoTo 0

Do While nodeCheck.Status = 0
  WScript.Sleep 100
Loop

If nodeCheck.ExitCode <> 0 Then
  MsgBox "Node.js non è installato o non è nel PATH. Installa Node.js 20 o superiore e riavvia Windows.", vbExclamation, "Keepa Buyer"
  WScript.Quit 1
End If

shell.CurrentDirectory = projectRoot
command = "cmd.exe /d /s /c node """ & fso.BuildPath(projectRoot, "src\launch.mjs") & """ >> """ & fso.BuildPath(dataDir, "launcher.log") & """ 2>&1"
shell.Run command, 0, False
