@echo off
rem Launch the Hassala native messaging host with Python on Windows.
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 "%~dp0hassala_writer.py" %*
) else (
  python "%~dp0hassala_writer.py" %*
)
