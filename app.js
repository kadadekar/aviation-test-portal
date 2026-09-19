const API_URL = "https://aviation-test-api.govapi838.workers.dev";

const QUESTIONS_API = `${API_URL}/api/questions`;
const SUBMIT_API = `${API_URL}/api/submit`;

let questions = [];
let currentQuestion = 0;
let answers = {};
let reviewQuestions = new Set();

let examStarted = false;
let examSubmitted = false;
let timerInterval = null;

let timeLeft = 50 * 60;

let studentData = {
  name: "",
  rollNo: "",
  batch: "",
  email: ""
};

let finalResult = null;


// ======================================================
// START EXAM
// ======================================================

async function startExam() {

  if (examStarted) return;

  studentData.name =
    document.getElementById("studentName").value.trim();

  studentData.rollNo =
    document.getElementById("rollNo").value.trim();

  studentData.batch =
    document.getElementById("batch").value.trim();

  studentData.email =
    document.getElementById("email").value.trim();


  if (
    !studentData.name ||
    !studentData.rollNo ||
    !studentData.batch ||
    !studentData.email
  ) {
    alert("Please fill all student details.");
    return;
  }


  const startButton =
    document.querySelector("#startScreen button");


  if (startButton) {
    startButton.disabled = true;
    startButton.textContent = "LOADING TEST...";
  }


  try {

    const response = await fetch(
      QUESTIONS_API + "?t=" + Date.now(),
      {
        method: "GET",
        cache: "no-store"
      }
    );


    if (!response.ok) {
      throw new Error("Question API error");
    }


    const data = await response.json();


    if (
      data.status !== "success" ||
      !Array.isArray(data.questions) ||
      data.questions.length !== 50
    ) {
      throw new Error("Invalid question data");
    }


    questions = data.questions;

    answers = {};
    reviewQuestions = new Set();

    currentQuestion = 0;

    timeLeft =
      (data.timeMinutes || 50) * 60;


    examStarted = true;
    examSubmitted = false;


    // Hide start screen
    document
      .getElementById("startScreen")
      .classList.add("hidden");


    // Show exam screen
    document
      .getElementById("examScreen")
      .classList.remove("hidden");


    renderQuestion();
    renderPalette();

    startTimer();


  } catch (error) {

    console.error(error);

    alert(
      "Unable to load the test.\n\n" +
      "Please check your internet connection and try again."
    );


    if (startButton) {
      startButton.disabled = false;
      startButton.textContent = "START EXAM";
    }

  }

}


// ======================================================
// TIMER
// ======================================================

function startTimer() {

  clearInterval(timerInterval);

  updateTimer();


  timerInterval = setInterval(() => {

    if (examSubmitted) {
      clearInterval(timerInterval);
      return;
    }


    timeLeft--;

    updateTimer();


    if (timeLeft <= 0) {

      clearInterval(timerInterval);

      alert(
        "Time is over.\n\nYour test will be submitted automatically."
      );

      submitTest(true);

    }

  }, 1000);

}


function updateTimer() {

  const timer =
    document.getElementById("timer");

  if (!timer) return;


  const minutes =
    Math.floor(timeLeft / 60);

  const seconds =
    timeLeft % 60;


  timer.textContent =
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0");


  if (timeLeft <= 300) {
    timer.style.color = "red";
  } else {
    timer.style.color = "";
  }

}


// ======================================================
// DISPLAY QUESTION
// ======================================================

function renderQuestion() {

  if (!questions.length) return;


  const q =
    questions[currentQuestion];


  // Question number
  const questionNumber =
    document.getElementById("questionNumber");

  if (questionNumber) {

    questionNumber.textContent =
      `Question ${currentQuestion + 1} of ${questions.length}`;

  }


  // Level
  const levelBadge =
    document.getElementById("levelBadge");

  if (levelBadge) {

    levelBadge.textContent =
      `LEVEL ${q.level}`;

  }


  // Question text
  const questionText =
    document.getElementById("questionText");

  if (questionText) {

    questionText.textContent =
      q.question;

  }


  // Options
  const optionsContainer =
    document.getElementById("options");


  if (optionsContainer) {

    optionsContainer.innerHTML = "";


    q.options.forEach((option, index) => {

      const button =
        document.createElement("button");


      button.type = "button";

      button.className = "option";


      if (answers[q.id] === option) {
        button.classList.add("selected");
      }


      const letter =
        String.fromCharCode(65 + index);


      button.innerHTML =
        `<span class="option-letter">${letter}</span>
         <span>${escapeHtml(option)}</span>`;


      button.onclick = function () {

        answers[q.id] = option;

        renderQuestion();
        updatePalette();

      };


      optionsContainer.appendChild(button);

    });

  }


  updateNavigation();

  updatePalette();

}


// ======================================================
// NEXT
// ======================================================

function nextQuestion() {

  if (!questions.length) return;


  if (
    currentQuestion <
    questions.length - 1
  ) {

    currentQuestion++;

    renderQuestion();

  }

}


// ======================================================
// PREVIOUS
// ======================================================

function previousQuestion() {

  if (!questions.length) return;


  if (currentQuestion > 0) {

    currentQuestion--;

    renderQuestion();

  }

}


// ======================================================
// CLEAR ANSWER
// ======================================================

function clearAnswer() {

  if (!questions.length) return;


  const q =
    questions[currentQuestion];


  delete answers[q.id];


  renderQuestion();

  updatePalette();

}


// ======================================================
// MARK FOR REVIEW
// ======================================================

function toggleReview() {

  if (!questions.length) return;


  const q =
    questions[currentQuestion];


  if (reviewQuestions.has(q.id)) {

    reviewQuestions.delete(q.id);

  } else {

    reviewQuestions.add(q.id);

  }


  updatePalette();

}


// ======================================================
// QUESTION PALETTE
// ======================================================

function renderPalette() {

  const palette =
    document.getElementById("questionPalette");


  if (!palette) return;


  palette.innerHTML = "";


  questions.forEach((q, index) => {

    const button =
      document.createElement("button");


    button.type = "button";

    button.textContent =
      index + 1;


    button.className =
      "palette-button";


    button.onclick = function () {

      currentQuestion = index;

      renderQuestion();

    };


    palette.appendChild(button);

  });


  updatePalette();

}


function updatePalette() {

  const buttons =
    document.querySelectorAll(
      "#questionPalette button"
    );


  buttons.forEach((button, index) => {

    const q =
      questions[index];


    button.classList.remove(
      "current",
      "answered",
      "reviewed"
    );


    if (index === currentQuestion) {

      button.classList.add("current");

    }


    if (
      q &&
      answers[q.id]
    ) {

      button.classList.add("answered");

    }


    if (
      q &&
      reviewQuestions.has(q.id)
    ) {

      button.classList.add("reviewed");

    }

  });

}


// ======================================================
// NAVIGATION BUTTONS
// ======================================================

function updateNavigation() {

  const previousButton =
    document.getElementById("previousBtn");


  const nextButton =
    document.getElementById("nextBtn");


  if (previousButton) {

    previousButton.disabled =
      currentQuestion === 0;

  }


  if (nextButton) {

    nextButton.disabled =
      currentQuestion === questions.length - 1;

  }

}


// ======================================================
// CONFIRM SUBMIT
// ======================================================

function confirmSubmit() {

  if (examSubmitted) return;


  const unanswered =
    questions.filter(
      q => !answers[q.id]
    ).length;


  let message;


  if (unanswered > 0) {

    message =
      `You have ${unanswered} unanswered question(s).\n\n` +
      "Are you sure you want to submit the test?";

  } else {

    message =
      "All questions are answered.\n\n" +
      "Are you sure you want to submit the test?";

  }


  if (confirm(message)) {

    submitTest(false);

  }

}


// ======================================================
// SUBMIT TEST
// ======================================================

async function submitTest(autoSubmit = false) {

  if (examSubmitted) return;


  examSubmitted = true;

  clearInterval(timerInterval);


  try {

    const response =
      await fetch(
        SUBMIT_API,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            answers: answers
          })
        }
      );


    if (!response.ok) {

      throw new Error(
        "Submission failed"
      );

    }


    const result =
      await response.json();


    if (result.status !== "success") {

      throw new Error(
        "Invalid result"
      );

    }


    finalResult = result;

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


// ======================================================
// SHOW RESULT
// ======================================================

function showResult(result) {

  document
    .getElementById("examScreen")
    .classList.add("hidden");


  document
    .getElementById("resultScreen")
    .classList.remove("hidden");


  // Result status
  const resultStatus =
    document.getElementById("resultStatus");


  if (resultStatus) {

    resultStatus.textContent =
      result.result;

    resultStatus.className =
      result.result === "PASS"
        ? "pass"
        : "fail";

  }


  // Score
  const score =
    document.getElementById("score");


  if (score) {

    score.textContent =
      result.score;

  }


  // Student
  const resultName =
    document.getElementById("resultName");


  if (resultName) {

    resultName.textContent =
      studentData.name;

  }


  // Roll number
  const resultRoll =
    document.getElementById("resultRoll");


  if (resultRoll) {

    resultRoll.textContent =
      studentData.rollNo;

  }


  // Correct
  const correctCount =
    document.getElementById("correctCount");


  if (correctCount) {

    correctCount.textContent =
      result.score;

  }


  // Wrong
  const wrongCount =
    document.getElementById("wrongCount");


  if (wrongCount) {

    wrongCount.textContent =
      result.review.filter(
        item =>
          !item.correct &&
          item.yourAnswer !== null
      ).length;

  }


  // Unanswered
  const unansweredCount =
    document.getElementById("unansweredCount");


  if (unansweredCount) {

    unansweredCount.textContent =
      result.review.filter(
        item =>
          item.yourAnswer === null
      ).length;

  }


  // Percentage
  const percentage =
    document.getElementById("percentage");


  if (percentage) {

    percentage.textContent =
      `${result.percentage}%`;

  }

}


// ======================================================
// SHOW ANSWERS
// ======================================================

function showReview() {

  if (!finalResult) return;


  const reviewArea =
    document.getElementById("reviewArea");


  if (!reviewArea) return;


  reviewArea.innerHTML = "";


  finalResult.review.forEach(
    (item, index) => {

      const box =
        document.createElement("div");


      box.className =
        "answer-review-item";


      const yourAnswer =
        item.yourAnswer === null
          ? "Not Answered"
          : item.yourAnswer;


      box.innerHTML = `

        <div class="card">

          <h3>
            Question ${index + 1}
          </h3>

          <p>
            <strong>
              ${escapeHtml(item.question)}
            </strong>
          </p>

          <p>
            <b>Your Answer:</b>
            ${escapeHtml(yourAnswer)}
          </p>

          <p>
            <b>Correct Answer:</b>
            ${escapeHtml(item.correctAnswer)}
          </p>

          <p>
            ${escapeHtml(item.reason)}
          </p>

        </div>

      `;


      reviewArea.appendChild(box);

    }
  );

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }


  return String(value)

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;")

    .replaceAll("'", "&#039;");

}


// ======================================================
// BASIC ANTI-CHEAT
// ======================================================

document.addEventListener(
  "contextmenu",
  function(event) {

    event.preventDefault();

  }
);


document.addEventListener(
  "copy",
  function(event) {

    event.preventDefault();

  }
);


document.addEventListener(
  "cut",
  function(event) {

    event.preventDefault();

  }
);


document.addEventListener(
  "paste",
  function(event) {

    event.preventDefault();

  }
);


document.addEventListener(
  "keydown",
  function(event) {

    if (
      event.ctrlKey ||
      event.metaKey
    ) {

      const key =
        event.key.toLowerCase();


      if (
        [
          "c",
          "v",
          "x",
          "u",
          "s",
          "p"
        ].includes(key)
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
      ["i", "j", "c"].includes(
        event.key.toLowerCase()
      )
    ) {

      event.preventDefault();

    }

  }
);


// ======================================================
// TAB SWITCH DETECTION
// ======================================================

document.addEventListener(
  "visibilitychange",
  function() {

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
