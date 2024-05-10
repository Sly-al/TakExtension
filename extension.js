const vscode = require('vscode');


// Функция для активации расширения
function activate(context) {
  const operators = ['lambda', 'print'];



  // Определяем декоратор для подсветки операторов
  const decorationType = vscode.window.createTextEditorDecorationType({
    color: 'rgba(0, 0, 255, 1)' // Цвет подсветки (в данном случае - желтый)
  });


  // Подписываемся на событие изменения в активном текстовом редакторе
  const disposable = vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor && editor.document.languageId === 'tak') { // Проверяем, что файл имеет расширение .tak
      

      const text = editor.document.getText(); // Получаем текст файла
      const regExp = new RegExp('\\b(' + operators.join('|') + ')\\b', 'g');
      const ranges = []; // Массив для хранения позиций операторов

      console.log(regExp.exec(text))

      let match;
      while ((match = regExp.exec(text)) !== null) {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);
        ranges.push(range); // Добавляем найденный диапазон в массив
      }

      // Применяем декоратор к найденным диапазонам
      editor.setDecorations(decorationType, ranges);
    }
  });

  // Сохраняем подписку для последующей очистки
  context.subscriptions.push(disposable);
}

// Функция для деактивации расширения
function deactivate() {}

module.exports = {
  activate,
  deactivate
};
