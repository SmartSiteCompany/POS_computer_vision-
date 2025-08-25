# Instalar npm y Node.js si aun no se tiene instalado
sudo apt update
sudo apt install nodejs npm -y

# clonar el repositorio
git clone git@github.com:SmartSiteCompany/POS_computer_vision-.git

# Moverse a la carpeta del repositorio
cd POS_computer_vision-

# Instalar las dependencias
npm install

# Crear carpeta en raíz con nombre "logs"

# Crear carpeta en raíz con nombre "dataset"

# Crear un archivo .env en raiz y colocar el siguiente contenido
Estructura del archivo .env 

SESSION_SECRET=pega_aqui_tu_secret_hex_largo 

MONGO_URI=mongodb://localhost:27017/faceDB 

NODE_ENV=development 

# Crear la clave para la sesión
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" 
reemplazala en el apartado correspondiente al archivo.env
# Ejecutar el proyecto
node server.js
