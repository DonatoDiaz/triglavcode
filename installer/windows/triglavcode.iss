; TriglavCode — установщик для Windows (Inno Setup 6)
;
; Сборка (из этой папки):
;   iscc /DMyAppVersion=1.19.0-triglav.1 ^
;        /DSourceExe="..\..\packages\opencode\dist\triglavcode-windows-x64\bin\triglavcode.exe" ^
;        triglavcode.iss
;
; Готовый файл: dist\TriglavCode-Setup-<версия>.exe

#ifndef MyAppVersion
  #define MyAppVersion "1.19.0-triglav.1"
#endif

; Путь к собранному бинарнику (по умолчанию — результат build.ts на Windows).
#ifndef SourceExe
  #define SourceExe "..\..\packages\opencode\dist\triglavcode-windows-x64\bin\triglavcode.exe"
#endif

#ifndef OutDir
  #define OutDir "dist"
#endif

#define MyAppName "TriglavCode"
#define MyAppPublisher "Triglav Labs"
#define MyAppURL "https://github.com/DonatoDiaz/triglavcode"
#define MyAppExeName "triglavcode.exe"
#define LauncherName "triglavcode-launcher.cmd"
#define IconFile "..\..\packages\app\public\favicon-triglav.ico"
#define GuideFile "..\..\docs\guides\triglavcode-guide.pdf"

[Setup]
AppId={{B6E4C3B2-7F1A-4E9D-9C2A-3D5F6A7B8C90}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}/releases
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
; Установка без прав администратора (в профиль пользователя), но с возможностью
; выбрать установку для всех пользователей.
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir={#OutDir}
OutputBaseFilename=TriglavCode-Setup-{#MyAppVersion}
SetupIconFile={#IconFile}
UninstallDisplayIcon={app}\triglavcode.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ChangesEnvironment=yes
CloseApplications=no
AllowNoIcons=yes

[Languages]
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "{#SourceExe}"; DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion
Source: "{#LauncherName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "QUICKSTART.ru.txt"; DestDir: "{app}"; DestName: "Быстрый старт.txt"; Flags: ignoreversion
Source: "{#IconFile}"; DestDir: "{app}"; DestName: "triglavcode.ico"; Flags: ignoreversion
Source: "{#GuideFile}"; DestDir: "{app}"; DestName: "triglavcode-guide.pdf"; Flags: ignoreversion skipifsourcedoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#LauncherName}"; WorkingDir: "{%USERPROFILE}"; IconFilename: "{app}\triglavcode.ico"; Comment: "Запустить {#MyAppName}"
Name: "{group}\Быстрый старт"; Filename: "{app}\Быстрый старт.txt"
Name: "{group}\Руководство (PDF)"; Filename: "{app}\triglavcode-guide.pdf"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#LauncherName}"; WorkingDir: "{%USERPROFILE}"; IconFilename: "{app}\triglavcode.ico"; Tasks: desktopicon

[Run]
; .cmd нельзя запустить через CreateProcess напрямую — оборачиваем в cmd /c.
Filename: "{cmd}"; Parameters: "/c ""{app}\{#LauncherName}"""; Description: "Запустить {#MyAppName}"; Flags: nowait postinstall skipifsilent

[Code]
const
  EnvironmentKey = 'Environment';

function EnvContainsPath(const Paths, Path: string): Boolean;
begin
  Result := Pos(';' + Uppercase(Path) + ';', ';' + Uppercase(Paths) + ';') > 0;
end;

procedure EnvAddPath(const Path: string);
var
  Paths: string;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', Paths) then
    Paths := '';
  if EnvContainsPath(Paths, Path) then
    exit;
  if (Paths <> '') and (Paths[Length(Paths)] <> ';') then
    Paths := Paths + ';';
  Paths := Paths + Path;
  RegWriteExpandStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', Paths);
end;

procedure EnvRemovePath(const Path: string);
var
  Paths: string;
  P: Integer;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', Paths) then
    exit;
  P := Pos(';' + Uppercase(Path) + ';', ';' + Uppercase(Paths) + ';');
  if P = 0 then
    exit;
  Delete(Paths, P, Length(Path) + 1);
  RegWriteExpandStringValue(HKEY_CURRENT_USER, EnvironmentKey, 'Path', Paths);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
    EnvAddPath(ExpandConstant('{app}'));
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
    EnvRemovePath(ExpandConstant('{app}'));
end;
