#!/bin/bash

# Убедитесь, что vsce установлен
if ! command -v vsce &> /dev/null
then
    echo "vsce could not be found, installing it globally using npm..."
    npm install -g vsce
fi

# Проверка успешности установки vsce
if ! command -v vsce &> /dev/null
then
    echo "vsce installation failed. Aborting."
    exit 1
fi

# Команда для сборки вашего расширения
echo "Building VS Code extension into a .vsix file..."
vsce package

# Проверка успешности сборки
if [ $? -eq 0 ]; then
    echo "Extension has been successfully packaged into a .vsix file."
else
    echo "Failed to package the extension."
    exit 1
fi
