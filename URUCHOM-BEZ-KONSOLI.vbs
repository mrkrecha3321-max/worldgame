' WorldForge: Nations - uruchomienie gry BEZ zadnego okna konsoli
' Serwer dziala ukryty w tle. Zatrzymanie: ZATRZYMAJ-SERWER.bat
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir

' Jesli zaleznosci nie sa zainstalowane - zainstaluj je raz (widocznie)
If Not fso.FolderExists(dir & "\node_modules\ws") Then
    sh.Run "cmd /c npm install --no-audit --no-fund", 1, True
End If

' Serwer juz dziala? Jesli nie - start ukryty
Set exec = sh.Exec("cmd /c netstat -ano | findstr "":8080"" | findstr ""LISTENING""")
out = exec.StdOut.ReadAll
If InStr(out, "8080") = 0 Then
    sh.Run "cmd /c node server.js", 0, False
    WScript.Sleep 4000
End If

' Gra w oknie aplikacji (najpierw Chrome, potem Edge, na koniec domyslna przegladarka)
pChrome = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe"
pChrome86 = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Google\Chrome\Application\chrome.exe"
pEdge86 = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
pEdge = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe"

If fso.FileExists(pChrome) Then
    sh.Run """" & pChrome & """ --app=http://localhost:8080", 1, False
ElseIf fso.FileExists(pChrome86) Then
    sh.Run """" & pChrome86 & """ --app=http://localhost:8080", 1, False
ElseIf fso.FileExists(pEdge86) Then
    sh.Run """" & pEdge86 & """ --app=http://localhost:8080", 1, False
ElseIf fso.FileExists(pEdge) Then
    sh.Run """" & pEdge & """ --app=http://localhost:8080", 1, False
Else
    sh.Run "http://localhost:8080", 1, False
End If
