# Instalar npm y Node.js si aun no se tiene instalado
sudo apt update
sudo apt install nodejs npm -y

# clonar el repositorio
git clone git@github.com:SmartSiteCompany/POS_computer_vision-.git

# Instalar las dependencias
npm install

# Instalar librerias adicinales en ubuntu
sudo apt install build-essential libcairo2-dev libpango1.0-dev
libjpeg-dev libgif-dev librsvg2-dev

# Ejecutar el proyecto
node server.js
