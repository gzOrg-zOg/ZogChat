#!/bin/bash

# Script de déploiement automatique pour ZogChat
# Usage: ./deploy.sh "Message de commit"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage avec couleurs
print_step() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Vérifier si un message de commit est fourni
if [ $# -eq 0 ]; then
    print_error "Aucun message de commit fourni!"
    echo "Usage: $0 \"Message de commit\""
    echo "Exemple: $0 \"Amélioration de l'interface mobile\""
    exit 1
fi

# Récupérer le message de commit
COMMIT_MESSAGE="$1"

print_step "Déploiement de ZogChat en cours..."
echo "Message de commit: \"$COMMIT_MESSAGE\""
echo

# Vérifier si on est dans un dépôt Git
if [ ! -d ".git" ]; then
    print_error "Ce répertoire n'est pas un dépôt Git!"
    exit 1
fi

# Étape 1: Ajouter tous les fichiers
print_step "Ajout des fichiers modifiés..."
if git add .; then
    print_success "Fichiers ajoutés avec succès"
else
    print_error "Erreur lors de l'ajout des fichiers"
    exit 1
fi

# Vérifier s'il y a des changements à commiter
if git diff --staged --quiet; then
    print_warning "Aucun changement à commiter"
    exit 0
fi

# Étape 2: Créer le commit
print_step "Création du commit..."
if git commit -m "$COMMIT_MESSAGE"; then
    print_success "Commit créé avec succès"
else
    print_error "Erreur lors de la création du commit"
    exit 1
fi

# Étape 3: Pousser vers origin main
print_step "Push vers origin main..."
if git push origin main; then
    print_success "Push réalisé avec succès"
    echo
    print_success "🚀 Déploiement terminé!"
    echo "Votre application ZogChat est maintenant mise à jour sur GitHub Pages"
else
    print_error "Erreur lors du push"
    print_warning "Le commit local a été créé mais n'a pas pu être poussé"
    exit 1
fi

# Afficher l'URL GitHub Pages (optionnel)
REPO_URL=$(git config --get remote.origin.url)
if [[ $REPO_URL == *"github.com"* ]]; then
    # Extraire le nom d'utilisateur et le nom du repo
    if [[ $REPO_URL =~ github\.com[:/]([^/]+)/([^/]+)(\.git)?$ ]]; then
        USERNAME="${BASH_REMATCH[1]}"
        REPO_NAME="${BASH_REMATCH[2]}"
        REPO_NAME="${REPO_NAME%.git}"  # Supprimer .git si présent
        echo
        print_step "🌐 Votre application sera disponible à:"
        echo "https://${USERNAME}.github.io/${REPO_NAME}/"
    fi
fi
