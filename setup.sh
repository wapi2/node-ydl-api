#!/bin/bash

# Descargar yt-dlp
echo "Downloading yt-dlp..."
wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O ./functions/yt-dlp
chmod +x ./functions/yt-dlp

# Verificar la instalación
echo "Verifying yt-dlp installation..."
./functions/yt-dlp --version