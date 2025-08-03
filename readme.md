# Instalar npm y Node.js si aun no se tiene instalado
sudo apt update
sudo apt install nodejs npm -y

# clonar el repositorio
git clone git@github.com:SmartSiteCompany/POS_computer_vision-.git

# Moverse a la carpeta del repositorio
cd POS_computer_vision-

# Instalar las dependencias
npm install

# Ejecutar el proyecto
node server.js
