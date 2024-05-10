const vscode = require('vscode');

// Функция для проверки правильности скобочной последовательности
function isValidBracketSequence(str) {
  const stack = [];
  const openingBrackets = ['(', '['];
  const closingBrackets = [')', ']'];
  const invalidBracketIndices = [];
  const validBracketRanges = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (openingBrackets.includes(char)) {
      stack.push({ type: char, index: i });
    } else if (closingBrackets.includes(char)) {
      const lastOpeningBracket = stack.pop();
      if (lastOpeningBracket) {
        const correspondingClosingBracket = closingBrackets[openingBrackets.indexOf(lastOpeningBracket.type)];
        if (char === correspondingClosingBracket) {
          validBracketRanges.push({
            start: lastOpeningBracket.index,
            end: i + 1,
            type: lastOpeningBracket.type
          });
        } else {
          invalidBracketIndices.push(lastOpeningBracket.index, i);
        }
      } else {
        invalidBracketIndices.push(i);
      }
    }
  }

  // Добавляем индексы оставшихся открывающих скобок в invalidBracketIndices
  stack.forEach(openingBracket => invalidBracketIndices.push(openingBracket.index));

  return { invalidBracketIndices, validBracketRanges };
}

// Функция для активации расширения
function activate(context) {
  const operators = [":=", "\\$=", "lambda", "\\?", "&&", "\\|\\|", "<=", ">=", "<", ">", "==", "\\+", "-", "\\*", "/", "%", "\\^", "!"];

  // Определяем декоратор для подсветки операторов
  const operatorDecorationType = vscode.window.createTextEditorDecorationType({
    color: 'rgba(0, 127, 255, 1)' // Цвет подсветки (в данном случае - синий)
  });

  // Определяем декоратор для подсветки комментариев, начинающихся с табуляции, пробелов и #
  const commentDecorationType = vscode.window.createTextEditorDecorationType({
    color: 'rgba(0, 128, 0, 1)' // Цвет подсветки (в данном случае - зеленый)
  });

  // Определяем декоратор для подсветки # во всех остальных случаях
  const hashDecorationType = vscode.window.createTextEditorDecorationType({
    color: 'rgba(0, 127, 255, 1)' // Цвет подсветки (в данном случае - синий)
  });
  const functionDecorationType = vscode.window.createTextEditorDecorationType({
    color: '#6699cc' // Серо-голубой цвет
  });
  // Декоратор для подсветки неправильных скобочных последовательностей
  const invalidBracketDecorationType = vscode.window.createTextEditorDecorationType({
    color: 'rgba(255, 0, 0, 1)' // Красный цвет
  });

  // Декоратор для подсветки правильных скобочных последовательностей из квадратных скобок
  const validSquareBracketDecorationType = vscode.window.createTextEditorDecorationType({
    color: 'rgba(255, 120, 0, 1)' // Яркий оранжевый цвет
  });

  // Декоратор для подсветки правильных скобочных последовательностей из круглых скобок
  const validParenthesesDecorationType = vscode.window.createTextEditorDecorationType({
    color: 'rgba(255, 180, 0, 1)' // Тускло-оранжевый цвет
  });

  const printDecorationType = vscode.window.createTextEditorDecorationType({
    color: '#6699cc' // Серо-голубой цвет
  });

  const disposable = vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor && editor.document.languageId === 'tak') {
      const text = editor.document.getText(); // Получаем текст файла
      const { invalidBracketIndices, validBracketRanges } = isValidBracketSequence(text);

      // Получаем диапазоны для неправильных и правильных скобочных последовательностей
      const invalidBracketRanges = invalidBracketIndices.map(index => {
        const startPos = new vscode.Position(
          editor.document.positionAt(index).line,
          editor.document.positionAt(index).character
        );
        const endPos = new vscode.Position(

          editor.document.positionAt(index + 1).line,
          editor.document.positionAt(index + 1).character
        );
        return new vscode.Range(startPos, endPos);
      });

      const validSquareBracketRanges = validBracketRanges
        .filter(r => r.type === '[')
        .map(r => [
          new vscode.Range(editor.document.positionAt(r.start), editor.document.positionAt(r.start + 1)),
          new vscode.Range(editor.document.positionAt(r.end - 1), editor.document.positionAt(r.end))
        ])
        .flat();

      const validParenthesesRanges = validBracketRanges
        .filter(r => r.type === '(')
        .map(r => [
          new vscode.Range(editor.document.positionAt(r.start), editor.document.positionAt(r.start + 1)),
          new vscode.Range(editor.document.positionAt(r.end - 1), editor.document.positionAt(r.end))
        ])
        .flat();

      // Получаем диапазоны для названий функций и их упоминаний
      const functionRanges = [];
      const functionRegex = /(\w+)\s*:=/g;
      let match;
      while ((match = functionRegex.exec(text)) !== null) {
        const functionName = match[1];
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + functionName.length);
        const range = new vscode.Range(startPos, endPos);
        functionRanges.push(range);

        // Ищем все упоминания функции в тексте
        const mentionRegex = new RegExp(`\\b${functionName}\\b`, 'g');
        let mentionMatch;
        while ((mentionMatch = mentionRegex.exec(text)) !== null) {
          const mentionStartPos = editor.document.positionAt(mentionMatch.index);
          const mentionEndPos = editor.document.positionAt(mentionMatch.index + functionName.length);
          const mentionRange = new vscode.Range(mentionStartPos, mentionEndPos);
          functionRanges.push(mentionRange);
        }
      }

      // Применяем декораторы к редактору
      editor.setDecorations(functionDecorationType, functionRanges);
      editor.setDecorations(invalidBracketDecorationType, invalidBracketRanges);
      validBracketRanges.forEach(range => {
        const decorationType = range.type === '[' ? validSquareBracketDecorationType : validParenthesesDecorationType;
        const startPos = new vscode.Position(
          editor.document.positionAt(range.start).line,
          editor.document.positionAt(range.start).character
        );
        const endPos = new vscode.Position(
          editor.document.positionAt(range.end).line,
          editor.document.positionAt(range.end).character
        );
        const decorationRange = new vscode.Range(startPos, endPos);
        editor.setDecorations(decorationType, [decorationRange]);
      });

      // Регулярное выражение для поиска вызовов функции print
      const printRegex = /print\(/g;
      const printMatches = text.matchAll(printRegex);

      // Диапазоны для подсветки вызовов print
      const printRanges = Array.from(printMatches, match => {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);
        return new vscode.Range(startPos, endPos);
      });

      // Очищаем старые декораторы
      editor.setDecorations(invalidBracketDecorationType, []);
      editor.setDecorations(validSquareBracketDecorationType, []);
      editor.setDecorations(validParenthesesDecorationType, []);

      // Устанавливаем новые декораторы
      editor.setDecorations(invalidBracketDecorationType, invalidBracketRanges);
      editor.setDecorations(validSquareBracketDecorationType, validSquareBracketRanges);
      editor.setDecorations(validParenthesesDecorationType, validParenthesesRanges);
      editor.setDecorations(printDecorationType, printRanges);

      const operatorRegExp = new RegExp('(' + operators.join('|') + ')', 'g');
      const commentRegExp = /^[\t ]*#.*$/gm; // Регулярное выражение для поиска строк, начинающихся с табуляции, пробелов и #
      const hashRegExp = /#(?!$|^[\t ]*#)/g; // Регулярное выражение для поиска # в других местах, кроме начала строки и после табуляции/пробелов

      // Получаем диапазоны для операторов, комментариев и #
      const operatorRanges = editor.document.getText().matchAll(operatorRegExp, null);
      const commentRanges = editor.document.getText().matchAll(commentRegExp, null);
      const hashRanges = editor.document.getText().matchAll(hashRegExp, null);

      // Очищаем старые декораторы
      editor.setDecorations(operatorDecorationType, []);
      editor.setDecorations(commentDecorationType, []);
      editor.setDecorations(hashDecorationType, []);

      // Устанавливаем новые декораторы
      editor.setDecorations(operatorDecorationType, [...operatorRanges].map(match => {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);
        return new vscode.Range(startPos, endPos);
      }));

      editor.setDecorations(commentDecorationType, [...commentRanges].map(match => {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + match[0].length);
        return new vscode.Range(startPos, endPos);
      }));

      editor.setDecorations(hashDecorationType, [...hashRanges].map(match => {
        const startPos = editor.document.positionAt(match.index);
        const endPos = editor.document.positionAt(match.index + 1);
        return new vscode.Range(startPos, endPos);
      }));
    }
  });

  context.subscriptions.push(disposable);
}


// Функция для деактивации расширения
function deactivate() {}

module.exports = {
  activate,
  deactivate
};
