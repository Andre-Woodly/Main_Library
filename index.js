require("dotenv").config();
const {
  Bot,
  GrammyError,
  HttpError,
  Keyboard,
  InlineKeyboard,
  session,
} = require("grammy");
const fs = require("fs").promises;
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const { format } = require("date-fns");
const { ru } = require("date-fns/locale");

const bot = new Bot(process.env.BOT_API_KEY);

bot.use(
  session({
    initial: () => ({
      correctAnswers: {
        html: 0,
        css: 0,
        js: 0,
        react: 0,
        go: 0,
      },
    }),
  })
);

let questionsData = {};
let db;

async function loadQuestions() {
  const categories = {
    html: "html_questions.json",
    css: "css_questions.json",
    js: "js_questions.json",
    react: "react_questions.json",
    go: "go_questions.json",
  };
  for (const [category, file] of Object.entries(categories)) {
    try {
      const data = await fs.readFile(`questions/${file}`, "utf8");
      questionsData[category] = JSON.parse(data).questions;
    } catch (error) {
      console.error(`Ошибка при загрузке вопросов из файла ${file}:`, error);
    }
  }
}

//Инициализация состояния первого запуска пользователя
function initializeQuizState(ctx, category) {
  if (!ctx.session.askedQuestions) {
    ctx.session.askedQuestions = {};
  }
  if (!ctx.session.askedQuestions[category]) {
    ctx.session.askedQuestions[category] = [];
  }
  if (ctx.session.firstAttempt === undefined) {
    ctx.session.firstAttempt = true;
  }
}

function getStartKeyboard() {
  return new Keyboard()
    .text("HTML")
    .text("CSS")
    .row()
    .text("JavaScript")
    .text("React")
    .row()
    .text("GO");
}

bot.command("start", async (ctx) => {
  const username = ctx.from.username || ctx.from.first_name;
  await username;

  const startKeyboard = getStartKeyboard();

  await ctx.reply(
    "Привет! Я помогу тебе подготовиться к собеседованию. Используй команды ниже для взаимодействия с ботом:\n",
    { reply_markup: startKeyboard }
  );
  await ctx.reply("С чего начнем? Выбирай тему👇", {
    reply_markup: startKeyboard,
  });
});

bot.on("message", async (ctx) => {
  const { text } = ctx.message;

  if (text === "Назад ↩️") {
    const startKeyboard = getStartKeyboard();
    await ctx.reply("Выберите категорию:", { reply_markup: startKeyboard });
  } else {
    switch (text) {
      case "HTML":
        ctx.session.firstAttempt = true;
        await startQuiz(ctx, "html");
        break;
      case "CSS":
        ctx.session.firstAttempt = true;
        await startQuiz(ctx, "css");
        break;
      case "JavaScript":
        ctx.session.firstAttempt = true;
        await startQuiz(ctx, "js");
        break;
      case "React":
        ctx.session.firstAttempt = true;
        await startQuiz(ctx, "react");
        break;
      case "GO":
        ctx.session.firstAttempt = true;
        await startQuiz(ctx, "go");
        break;
      case "/profile":
        ctx.session.firstAttempt = true;
        await ctx.reply(`Удачи! ${ctx.from.first_name}`);
        break;
      default:
        handleQuizAnswer(ctx, text);
    }
  }
});

async function handleQuizAnswer(ctx, answer) {
  try {
    if (!ctx.session.currentQuestion) {
      await ctx.reply("Кажется, я забыл вопрос. Давай начнем заново.");
      return;
    }

    const correctAnswer =
      ctx.session.currentQuestion.options[
        ctx.session.currentQuestion.correctOption
      ];

    if (answer === correctAnswer) {
      await ctx.reply(`Верно!\n${ctx.session.currentQuestion.explanation}`);
      if (ctx.session.firstAttempt) {
        ctx.session.correctAnswers[ctx.session.currentCategory]++;
      }
      await startQuiz(ctx, ctx.session.currentCategory);
    } else {
      await ctx.reply("Неправильно. Попробуйте еще раз.");
    }
  } catch (error) {
    console.error("Ошибка обработки ответа на вопрос:", error);
    await ctx.reply(
      "Произошла ошибка при обработке ответа на вопрос. Попробуйте еще раз позже."
    );
  }
}

function getRandomQuestion(questions, asked) {
  const availableQuestions = questions.filter(
    (_, index) => !asked.includes(index)
  );
  if (availableQuestions.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * availableQuestions.length);
  return availableQuestions[randomIndex];
}

async function startQuiz(ctx, category) {
  initializeQuizState(ctx, category);

  const questions = questionsData[category];
  if (!questions) {
    await ctx.reply(
      `Не удалось загрузить вопросы для категории ${category.toUpperCase()}. Проверьте файл: questions/${category}_questions.json`
    );
    return;
  }

  const questionData = getRandomQuestion(
    questions,
    ctx.session.askedQuestions[category]
  );
  if (!questionData) {
    const retryKeyboard = new Keyboard().text("Да").row().text("Нет").row();

    await ctx.reply(
      `Вы ответили на все вопросы по ${category.toUpperCase()}! Желаете повторить?`,
      {
        reply_markup: retryKeyboard,
      }
    );

    ctx.session.awaitingRetryConfirmation = category;
    return;
  }

  const questionIndex = questions.indexOf(questionData);
  ctx.session.askedQuestions[category].push(questionIndex);
  ctx.session.currentQuestion = questionData;
  ctx.session.currentCategory = category;

  const keyboard = new Keyboard();
  questionData.options.forEach((option) => keyboard.text(option).row());
  keyboard.text("Назад ↩️").row();

  await ctx.reply(questionData.question, { reply_markup: keyboard });
}

(async () => {
  await loadQuestions();
  bot.start();
})();
