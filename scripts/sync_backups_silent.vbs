' ==============================================================================
' Vectrieve - Silent Background Backup Synchronizer (Windows)
' ==============================================================================
' Executes `python scripts/sync_backups.py --source r2` with zero console popups.
' ==============================================================================

Dim WshShell, fso, scriptDir, projectDir, pythonExe, runCmd

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Resolve project directory
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptDir)
WshShell.CurrentDirectory = projectDir

pythonExe = "C:\Python314\python.exe"
If Not fso.FileExists(pythonExe) Then
    pythonExe = "python.exe"
End If

runCmd = """" & pythonExe & """ """ & projectDir & "\scripts\sync_backups.py"" --source r2"

' 0 = Hide window completely, True = Wait for completion
WshShell.Run runCmd, 0, True
