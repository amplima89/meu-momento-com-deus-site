@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo LIFE STYLE - ANKI DE FRASES COMPLETAS
echo ============================================================
echo.

if not exist "%~dp0meu-momento-com-deus-site\ATUALIZAR_SITE.ps1" goto pasta_errada

echo Publicando a melhoria do Anki no site...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0meu-momento-com-deus-site\ATUALIZAR_SITE.ps1"
if errorlevel 1 goto erro

echo.
echo ============================================================
echo ATUALIZACAO CONCLUIDA
echo ============================================================
echo.
echo Agora o Anki mostra uma frase COMPLETA em portugues.
echo Voce tenta reconstruir a frase inteira em ingles e depois revela
 echo a frase que realmente praticou.
echo.
echo Abra o Life Style e pressione Ctrl + F5 uma vez.
echo.
pause
exit /b 0

:pasta_errada
echo.
echo ERRO: esta atualizacao nao esta dentro da pasta principal do projeto.
echo.
echo Copie TODO o conteudo deste pacote para a pasta que contem:
echo   - Meu Momento com Deus
echo   - meu-momento-com-deus-site
echo.
echo Escolha "Substituir os arquivos no destino".
echo Depois execute este BAT novamente.
echo.
pause
exit /b 1

:erro
echo.
echo A publicacao do site falhou. Leia a mensagem acima.
echo.
pause
exit /b 1
