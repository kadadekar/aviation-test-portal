const API_URL =
  "https://aviation-test-api.govapi838.workers.dev";

const QUESTIONS_API = `${API_URL}/api/questions`;
const SUBMIT_API = `${API_URL}/api/submit`;

let questions = [];
let currentQuestion = 0;
let answers = {};
let reviewQuestions = new Set();

let examStarted = false;
let examSubmitted = false;

const EXAM_MINUTES = 50;
let timeLeft = EXAM_MINUTES * 60;
let timerInterval = null;


// ===============================
// START EXAM
// ===============================

async function startExam() {
  if (examStarted) return;

  const name = document.getElementById("studentName").value.trim();
  const rollNo = document.getElementById("rollNo").value.trim();
  const batch = document.getElementById("batch").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!name || !rollNo || !batch || !email) {
    alert("Please fill all student details.");
    return;
  }

  const startButton = document.querySelector("#startScreen button");

  if (startButton) {
    startButton.disabled = true;
    startButton.textContent = "Loading Test...";
  }

  try {
    const response = await fetch(QUESTIONS_API, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Unable to load questions.");
    }

    const data = await response.json();

    if (
      data.status !== "success" ||
      !Array.isArray(data.questions) ||
      data.questions.length !== 50
    ) {
      throw new Error("Question data is invalid.");
    }

    questions = data.questions;

    answers = {};
    reviewQuestions = new Set();

    currentQuestion = 0;

    timeLeft = (data.timeMinutes || EXAM_MINUTES) * 60;

    examStarted = true;
    examSubmitted = false;

    document.getElementById("startScreen").style.display = "none";
    document.getElementById("examScreen").style.display = "block";

    startTimer();
    renderQuestion();
    renderPalette();

  } catch (error) {
    console.error(error);

    alert(
      "Unable to load the test.\n\n" +
      "Please check your internet connection and try again."
    );

    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = "Start Test";
    }
  }
}


// ===============================
// TIMER
// ===============================

function startTimer() {
  clearInterval(timerInterval);

  updateTimerDisplay();

  timerInterval = setInterval(() => {

    if (examSubmitted) {
      clearInterval(timerInterval);
      return;
    }

    timeLeft--;

    updateTimerDisplay();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);

      alert("Time is over. Your test will be submitted automatically.");

      submitTest(true);
    }

  }, 1000);
}


function updateTimerDisplay() {

  const timer = document.getElementById("timer");

  if (!timer) return;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  timer.textContent =
    `${String(minutes).padStart(2, "0")}:` +
    `${String(seconds).padStart(2, "0")}`;

  if (timeLeft <= 300) {
    timer.classList.add("warning");
  } else {
    timer.classList.remove("warning");
  }
}


// ===============================
// RENDER QUESTION
// ===============================

function renderQuestion() {

  if (!questions.length) return;

  const q = questions[currentQuestion];

  const questionNumber =
    document.getElementById("questionNumber");

  const level =
    document.getElementById("level");

  const questionText =
    document.getElementById("question");

  const optionsContainer =
    document.getElementById("options");

  if (questionNumber) {
    questionNumber.textContent =
      `Question ${currentQuestion + 1} of ${questions.length}`;
  }

  if (level) {
    level.textContent = `Level ${q.level}`;
  }

  if (questionText) {
    questionText.textContent = q.question;
  }

  if (optionsContainer) {

    optionsContainer.innerHTML = "";

    q.options.forEach((option, index) => {

      const optionButton =
        document.createElement("button");

      optionButton.type = "button";

      optionButton.className = "option";

      if (answers[q.id] === option) {
        optionButton.classList.add("selected");
      }

      optionButton.innerHTML =
        `<span class="option-letter">${String.fromCharCode(65 + index)}</span>` +
        `<span>${escapeHtml(option)}</span>`;

      optionButton.addEventListener("click", () => {

        answers[q.id] = option;

        renderQuestion();
        renderPalette();

      });

      optionsContainer.appendChild(optionButton);

    });
  }

  updateNavigationButtons();
  updatePalette();
}


// ===============================
// NAVIGATION
// ===============================

function nextQuestion() {

  if (currentQuestion < questions.length - 1) {

    currentQuestion++;

    renderQuestion();

  } else {

    alert("You are on the last question.");

  }
}


function previousQuestion() {

  if (currentQuestion > 0) {

    currentQuestion--;

    renderQuestion();

  }

}


function clearAnswer() {

  const q = questions[currentQuestion];

  if (!q) return;

  delete answers[q.id];

  renderQuestion();
  renderPalette();

}


function toggleReview() {

  const q = questions[currentQuestion];

  if (!q) return;

  if (reviewQuestions.has(q.id)) {

    reviewQuestions.delete(q.id);

  } else {

    reviewQuestions.add(q.id);

  }

  updatePalette();

}


// ===============================
// PALETTE
// ===============================

function renderPalette() {

  const palette =
    document.getElementById("questionPalette");

  if (!palette) return;

  palette.innerHTML = "";

  questions.forEach((q, index) => {

    const button =
      document.createElement("button");

    button.type = "button";

    button.textContent = index + 1;

    button.className = "palette-button";

    button.addEventListener("click", () => {

      currentQuestion = index;

      renderQuestion();

    });

    palette.appendChild(button);

  });

  updatePalette();

}


function updatePalette() {

  const buttons =
    document.querySelectorAll(".palette-button");

  buttons.forEach((button, index) => {

    const q = questions[index];

    button.classList.remove(
      "current",
      "answered",
      "reviewed"
    );

    if (index === currentQuestion) {
      button.classList.add("current");
    }

    if (q && answers[q.id]) {
      button.classList.add("answered");
    }

    if (q && reviewQuestions.has(q.id)) {
      button.classList.add("reviewed");
    }

  });

}


// ===============================
// NAVIGATION BUTTONS
// ===============================

function updateNavigationButtons() {

  const previous =
    document.getElementById("previousBtn");

  const next =
    document.getElementById("nextBtn");

  if (previous) {
    previous.disabled = currentQuestion === 0;
  }

  if (next) {

    next.disabled =
      currentQuestion === questions.length - 1;

  }

}


// ===============================
// SUBMIT TEST
// ===============================

async function submitTest(autoSubmit = false) {

  if (examSubmitted) return;

  if (!autoSubmit) {

    const unanswered =
      questions.filter(q => !answers[q.id]).length;

    if (unanswered > 0) {

      const confirmSubmit =
        confirm(
          `${unanswered} question(s) are unanswered.\n\n` +
          "Do you want to submit the test?"
        );

      if (!confirmSubmit) {
        return;
      }

    } else {

      const confirmSubmit =
        confirm(
          "Are you sure you want to submit the test?"
        );

      if (!confirmSubmit) {
        return;
      }

    }

  }

  examSubmitted = true;

  clearInterval(timerInterval);

  try {

    const response =
      await fetch(SUBMIT_API, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          answers: answers

        })

      });

    if (!response.ok) {
      throw new Error("Submission failed.");
    }

    const result =
      await response.json();

    if (result.status !== "success") {
      throw new Error("Invalid result.");
    }

    showResult(result);

  } catch (error) {

    console.error(error);

    examSubmitted = false;

    alert(
      "There was a problem submitting your test.\n\n" +
      "Please check your internet connection and try again."
    );

  }

}


// ===============================
// SHOW RESULT
// ===============================

function showResult(result) {

  const examScreen =
    document.getElementById("examScreen");

  const resultScreen =
    document.getElementById("resultScreen");

  if (examScreen) {
    examScreen.style.display = "none";
  }

  if (resultScreen) {
    resultScreen.style.display = "block";
  }

  const resultStatus =
    document.getElementById("resultStatus");

  const score =
    document.getElementById("score");

  const correct =
    document.getElementById("correct");

  const wrong =
    document.getElementById("wrong");

  const unanswered =
    document.getElementById("unanswered");

  const percentage =
    document.getElementById("percentage");

  if (resultStatus) {
    resultStatus.textContent = result.result;
    resultStatus.className =
      result.result === "PASS"
        ? "pass"
        : "fail";
  }

  if (score) {
    score.textContent =
      `${result.score} / ${result.total}`;
  }

  if (correct) {
    correct.textContent = result.score;
  }

  if (wrong) {

    wrong.textContent =
      result.review.filter(
        item =>
          !item.correct &&
          item.yourAnswer !== null
      ).length;

  }

  if (unanswered) {

    unanswered.textContent =
      result.review.filter(
        item => item.yourAnswer === null
      ).length;

  }

  if (percentage) {
    percentage.textContent =
      `${result.percentage}%`;
  }

  window.finalResult = result;

}


// ===============================
// VIEW ANSWERS
// ===============================

function viewAnswers() {

  if (!window.finalResult) return;

  const result =
    window.finalResult;

  const reviewContainer =
    document.getElementById("answerReview");

  if (!reviewContainer) return;

  reviewContainer.innerHTML = "";

  result.review.forEach((item, index) => {

    const div =
      document.createElement("div");

    div.className = "answer-review-item";

    const yourAnswer =
      item.yourAnswer === null
        ? "Not answered"
        : item.yourAnswer;

    div.innerHTML = `
      <h3>Question ${index + 1}</h3>
      <p><strong>${escapeHtml(item.question)}</strong></p>
      <p>Your answer: ${escapeHtml(yourAnswer)}</p>
      <p>Correct answer: ${escapeHtml(item.correctAnswer)}</p>
      <p>${escapeHtml(item.reason)}</p>
    `;

    reviewContainer.appendChild(div);

  });

}


// ===============================
// SECURITY / BASIC ANTI-CHEAT
// ===============================

document.addEventListener(
  "contextmenu",
  event => event.preventDefault()
);

document.addEventListener(
  "copy",
  event => event.preventDefault()
);

document.addEventListener(
  "cut",
  event => event.preventDefault()
);

document.addEventListener(
  "paste",
  event => event.preventDefault()
);

document.addEventListener(
  "keydown",
  event => {

    if (
      event.ctrlKey ||
      event.metaKey
    ) {

      const blockedKeys =
        ["c", "v", "x", "u", "s", "p"];

      if (
        blockedKeys.includes(
          event.key.toLowerCase()
        )
      ) {

        event.preventDefault();

      }

    }

    if (event.key === "F12") {

      event.preventDefault();

    }

    if (
      event.ctrlKey &&
      event.shiftKey &&
      ["I", "J", "C"].includes(event.key)
    ) {

      event.preventDefault();

    }

  }
);


// ===============================
// TAB SWITCH DETECTION
// ===============================

document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.hidden &&
      examStarted &&
      !examSubmitted
    ) {

      console.log(
        "Student left the exam tab."
      );

    }

  }
);


// ===============================
// FULLSCREEN DETECTION
// ===============================

document.addEventListener(
  "fullscreenchange",
  () => {

    if (
      examStarted &&
      !examSubmitted &&
      !document.fullscreenElement
    ) {

      console.log(
        "Student exited fullscreen."
      );

    }

  }
);


// ===============================
// HTML ESCAPE
// ===============================

function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// ===============================
// BUTTON CONNECTIONS
// ===============================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const startButton =
      document.getElementById("startTestBtn");

    const nextButton =
      document.getElementById("nextBtn");

    const previousButton =
      document.getElementById("previousBtn");

    const clearButton =
      document.getElementById("clearBtn");

    const reviewButton =
      document.getElementById("reviewBtn");

    const submitButton =
      document.getElementById("submitBtn");

    const viewAnswersButton =
      document.getElementById("viewAnswersBtn");

    if (startButton) {
      startButton.addEventListener(
        "click",
        startExam
      );
    }

    if (nextButton) {
      nextButton.addEventListener(
        "click",
        nextQuestion
      );
    }

    if (previousButton) {
      previousButton.addEventListener(
        "click",
        previousQuestion
      );
    }

    if (clearButton) {
      clearButton.addEventListener(
        "click",
        clearAnswer
      );
    }

    if (reviewButton) {
      reviewButton.addEventListener(
        "click",
        toggleReview
      );
    }

    if (submitButton) {
      submitButton.addEventListener(
        "click",
        () => submitTest(false)
      );
    }

    if (viewAnswersButton) {
      viewAnswersButton.addEventListener(
        "click",
        viewAnswers
      );
    }

  }
);
