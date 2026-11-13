#!/usr/bin/env bash
# Antes de publicar: confirma que os segredos e a configuração do Firebase existem.
# Se faltar algo, falha sem publicar nada. Ver docs/configuracao.md.
missing=""
for name in ANDROID_KEYSTORE_BASE64 ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_ALIAS ANDROID_KEY_PASSWORD FIREBASE_SERVICE_ACCOUNT HOSTING_URL; do
  [ -n "${!name}" ] || missing="$missing $name"
done
if grep -q PREENCHER src/access/firebase-config.js .firebaserc; then
  missing="$missing src/access/firebase-config.js/.firebaserc"
fi
if [ -n "$missing" ]; then
  echo "::error::Falta configuração:$missing. Segue docs/configuracao.md. Nada foi publicado."
  exit 1
fi
echo "Configuração completa."
