@echo off
REM ==============================================================================
REM Vectrieve - Register Windows Scheduled Task for Weekly Backup Sync
REM ==============================================================================
echo [*] Registering Vectrieve_Backup_Sync task in Windows Task Scheduler...

powershell -NoProfile -ExecutionPolicy Bypass -Command "& { $action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument 'C:\Projects\Vectrieve\scripts\sync_backups_silent.vbs'; $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 12:00PM; $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 1); Register-ScheduledTask -TaskName 'Vectrieve_Backup_Sync' -Action $action -Trigger $trigger -Settings $settings -Force }"

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] Task registered successfully.
    echo           - Schedule: Every Sunday at 12:00 PM
    echo           - Catch-up: Runs immediately if laptop was asleep/turned off
    echo           - Battery:  Runs even on battery power
) else (
    echo [ERROR] Failed to register task.
)
pause
