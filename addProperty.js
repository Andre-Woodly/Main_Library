const fs = require("fs");
const path = require("path");

// Определение путей к файлам
const inputFilePath = path.join(__dirname, "questions/css_questions.json");
const outputFilePath = path.join(__dirname, "questions/css_questions.json");

// Прочитать данные из файла
fs.readFile(inputFilePath, "utf-8", (err, data) => {
  if (err) {
    console.error("Ошибка чтения файла:", err);
    return;
  }

  try {
    // Парсинг JSON данных
    const jsonData = JSON.parse(data);

    // Проверка, что данные содержат массив `questions`
    if (!Array.isArray(jsonData.questions)) {
      console.error(
        "Ошибка: данные должны содержать массив объектов под ключом `questions`."
      );
      return;
    }

    // Добавить новое свойство `level_Difficult` ко всем объектам внутри массива `questions`
    jsonData.questions.forEach((question) => {
      question.explanation = ""; // Или любое другое значение, которое вам нужно
    });

    // Записать обновленные данные обратно в файл
    fs.writeFile(outputFilePath, JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error("Ошибка записи файла:", err);
        return;
      }
      console.log('Свойство "explanation" добавлено ко всем вопросам.');
    });
  } catch (parseError) {
    console.error("Ошибка парсинга JSON:", parseError);
  }
});
