#!/bin/bash

# Nom du projet
PROJECT_NAME="drone-optimizer-backend"

echo "Création de la structure pour : $PROJECT_NAME"

# Création des répertoires
mkdir -p $PROJECT_NAME/{app/api/v1/endpoints,app/core,app/models,app/services,tests}

# Création des fichiers vides
touch $PROJECT_NAME/app/__init__.py
touch $PROJECT_NAME/app/api/__init__.py
touch $PROJECT_NAME/app/api/v1/__init__.py
touch $PROJECT_NAME/app/api/v1/endpoints/__init__.py
touch $PROJECT_NAME/app/api/v1/endpoints/optimizer.py
touch $PROJECT_NAME/app/core/{config.py,security.py}
touch $PROJECT_NAME/app/models/optimization.py
touch $PROJECT_NAME/app/services/{__init__.py,solver.py}
touch $PROJECT_NAME/tests/__init__.py
touch $PROJECT_NAME/{Dockerfile,docker-compose.yml,requirements.txt,README.md}

# Ajout d'un contenu minimal pour main.py
cat <<EOF > $PROJECT_NAME/app/main.py
from fastapi import FastAPI

app = FastAPI(title="Drone Optimizer API")

@app.get("/")
def read_root():
    return {"message": "Bienvenue sur l'API d'optimisation de trajectoire"}
EOF

echo "Structure créée avec succès !"
