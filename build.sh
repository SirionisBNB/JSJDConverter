#!/bin/bash

# Убедитесь, что все зависимости npm установлены
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

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

# Компиляция TypeScript кода
echo "Compiling TypeScript code..."
tsc -p ./tsconfig.json

# Проверка успешности компиляции
if [ $? -ne 0 ]; then
    echo "TypeScript compilation failed. Aborting."
    exit 1
fi

# Создание папки для результата, если ее еще нет
mkdir -p vsix

# Команда для сборки вашего расширения
echo "Building VS Code extension into a .vsix file..."
vsce package --out ./vsix

# Проверка успешности сборки
if [ $? -eq 0 ]; then
    echo "Extension has been successfully packaged into a .vsix file in the 'vsix' folder."
else
    echo "Failed to package the extension."
    exit 1
fi
