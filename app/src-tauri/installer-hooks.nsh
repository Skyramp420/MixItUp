; MixItUp – háčiky NSIS inštalátora
; ChatMix engine (MixItUp.exe --engine) drží .exe otvorený -> pred kopírovaním ho slušne ukonči
; (vráti hlasitosti aplikácií), po inštalácii ho spusti znova, ak je zapnutý autoštart.

!macro NSIS_HOOK_PREINSTALL
  IfFileExists "$INSTDIR\MixItUp.exe" 0 +2
    nsExec::Exec '"$INSTDIR\MixItUp.exe" --stop'
  Sleep 300
  nsExec::Exec 'taskkill /IM MixItUp.exe /F'
  Sleep 400
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MixItUp"
  StrCmp $0 "" +3
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MixItUp" '"$INSTDIR\MixItUp.exe" --engine'
    Exec '"$INSTDIR\MixItUp.exe" --engine'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::Exec '"$INSTDIR\MixItUp.exe" --uninstall'
  Sleep 300
  nsExec::Exec 'taskkill /IM MixItUp.exe /F'
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "MixItUp"
!macroend
