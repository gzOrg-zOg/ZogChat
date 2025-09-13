#!/bin/bash

# Script de déploiement rapide pour ZogChat
# Usage: ./quick-deploy.sh "Message de commit"

if [ $# -eq 0 ]; then
    echo "❌ Erreur: Aucun message de commit fourni!"
    echo "Usage: $0 \"Message de commit\""
    exit 1
fi

echo "🚀 Déploiement en cours..."
git add .
git commit -m "$1"
git push origin main
echo "✅ Terminé!"
