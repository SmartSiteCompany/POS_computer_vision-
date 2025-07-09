
# Reconocimiento Facial con Node.js y Face-API.js

Este es un proyecto de reconocimiento facial en tiempo real y desde imágenes utilizando Node.js, face-api.js y SQLite como base de datos local.


## Características

- Registro de múltiples rostros desde la cámara o imágenes.
- Identificación facial en tiempo real desde cámara web.
- Detección de duplicados para evitar registros repetidos.
- Dibujo de recuadros con color único para cada rostro.
- Almacenamiento de encodings faciales con timestamp.
- Procesamiento de imágenes cargadas desde formulario.
- Base de datos en SQLite para facilidad local.


## librerías utilizadas y stack utilizado

- Node.js
- Express
- face-api.js con modelos:
  - ssd_mobilenetv1 → detección rápida de rostros.
  - face_landmark_68 → puntos clave del rostro.
  - face_recognition → generación de descriptores para comparación.
- Canvas (Node-canvas) para manipulación de imágenes.
- SQLite3 como base de datos local.
- Multer para subida de imágenes.
- HTML y CSS para front end.
- tensorflow

  "dependencies":
    "@tensorflow/tfjs-node": "^4.22.0",
    "@vladmandic/face-api": "^1.7.15",
    "bcryptjs": "^3.0.2",
    "body-parser": "^2.2.0",
    "canvas": "^3.1.0",
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "face-api.js": "^0.20.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.16.1",
    "multer": "^2.0.1",
    "sqlite3": "^5.1.7"

## Estructura del proyecto

POS_computer_vision-/
|
├── dataset/ # Almacena imagenes de los rostros registrados
|
├── face-api-models/ # Modelos de FaceAPI (pre-entrenados)
|
├── models/
│ ├── db.js # Configuración de SQLite
|
├── public/
│ ├── identify.html # Interfaz de identificación
| ├── identify.js 
│ ├── index.html # Interfaz principal (registro o identificación)
| ├── register.html 
| ├── register.js
│ ├── script.js # Lógica de registro desde cámara
| ├── styles.css # Estilos globales
| ├── upload.html
│ └── uploads.js
|
├── uploads/
|
├── .gitignore # Archivos o carpetas ignoradas para su subida a git
|
├── face.db # Base de datos del proyecto
|
├── faceHelper.js
|
├── readme_rf.md
|
├── routes.js # Lógica backend de las rutas API
|
└── server.js # Servidor Express


# --Instalación del proyeto-- #

# Instalar npm y Node.js si aun no se tiene instalado
sudo apt update
sudo apt install nodejs npm -y

# clonar el repositorio
git clone git@github.com:SmartSiteCompany/POS_computer_vision-.git

cd POS_computer_vision-

# Instalar las librerias y dependencias con este comando
npm install

# Ejecutar archivo que contiene el servidor del proyecto
node server.js 