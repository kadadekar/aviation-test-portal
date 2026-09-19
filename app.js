let allQuestions = [];
let examQuestions = [];

let currentQuestion = 0;
let answers = {};
let markedForReview = {};

let remainingSeconds = 50 * 60;
let timerInterval = null;

let student = {
  name: "",
  roll: "",
  batch: "",
  email: ""
};

let examFinished = false;


/* LOAD QUESTIONS */

async function loadQuestions() {

  const response = await fetch("questions.json");

  if (!response.ok) {
    throw new Error("Unable to load questions.json");
  }

  allQuestions = await response.json();

  if (allQuestions.length < 50) {
    throw new Error("Question bank must contain at least 50 questions.");
  }
}


/* START */

async function startExam() {

  try {

    student.name = document.getElementById("studentName").value.trim();
    student.roll = document.getElementById("rollNo").value.trim();
    student.batch = document.getElementById("batch").value.trim();
    student.email = document.getElementById("email").value.trim();

    if (!student.name ||
        !student.roll ||
        !student.batch ||
        !student.email) {

      alert("Please fill all student details.");
      return;
    }

    await loadQuestions();

    examQuestions = shuffle(
      [...allQuestions]
    ).slice(0, 50);

    examQuestions = examQuestions.map(q => {

      return {
        ...q,
        options: shuffle([...q.options])
      };

    });

    currentQuestion = 0;
    answers = {};
    markedForReview = {};
    remainingSeconds = 50 * 60;
    examFinished = false;

    document.getElementById("startScreen")
      .classList.add("hidden");

    document.getElementById("examScreen")
      .classList.remove("hidden");

    renderQuestion();
    renderPalette();
    startTimer();

    enableExamSecurity();

  } catch (error) {

    console.error(error);

    alert(
      "Could not start the exam.\n\n" +
      error.message
    );
  }
}


/* QUESTION */

function renderQuestion() {

  const q = examQuestions[currentQuestion];

  document.getElementById("questionNumber").textContent =
    `Question ${currentQuestion + 1} of ${examQuestions.length}`;

  document.getElementById("levelBadge").textContent =
    `LEVEL ${q.level}`;

  document.getElementById("questionText").textContent =
    q.question;

  const optionsDiv =
    document.getElementById("options");

  optionsDiv.innerHTML = "";

  q.options.forEach((option, index) => {

    const label = document.createElement("label");

    label.className = "option";

    const radio = document.createElement("input");

    radio.type = "radio";
    radio.name = "answer";
    radio.value = option;

    if (answers[currentQuestion] === option) {
      radio.checked = true;
    }

    radio.addEventListener("change", () => {

      answers[currentQuestion] = option;

      renderPalette();

    });

    label.appendChild(radio);
    label.appendChild(
      document.createTextNode(option)
    );

    optionsDiv.appendChild(label);

  });

  document.getElementById("previousBtn").disabled =
    currentQuestion === 0;

  document.getElementById("nextBtn").textContent =
    currentQuestion === examQuestions.length - 1
      ? "Finish →"
      : "Next →";

  renderPalette();
}


/* NEXT */

function nextQuestion() {

  if (currentQuestion === examQuestions.length - 1) {

    confirmSubmit();

    return;
  }

  currentQuestion++;

  renderQuestion();

}


/* PREVIOUS */

function previousQuestion() {

  if (currentQuestion > 0) {

    currentQuestion--;

    renderQuestion();

  }

}


/* CLEAR */

function clearAnswer() {

  delete answers[currentQuestion];

  renderQuestion();

}


/* REVIEW */

function toggleReview() {

  markedForReview[currentQuestion] =
    !markedForReview[currentQuestion];

  renderPalette();

}


/* PALETTE */

function renderPalette() {

  const palette =
    document.getElementById("questionPalette");

  palette.innerHTML = "";

  examQuestions.forEach((q, index) => {

    const button =
      document.createElement("button");

    button.className = "palette-btn";

    button.textContent = index + 1;

    if (answers[index]) {
      button.classList.add("answered");
    }

    if (markedForReview[index]) {
      button.classList.add("reviewed");
    }

    if (index === currentQuestion) {
      button.classList.add("current");
    }

    button.onclick = () => {

      currentQuestion = index;

      renderQuestion();

    };

    palette.appendChild(button);

  });

}


/* TIMER */

function startTimer() {

  clearInterval(timerInterval);

  updateTimer();

  timerInterval = setInterval(() => {

    remainingSeconds--;

    updateTimer();

    if (remainingSeconds <= 0) {

      clearInterval(timerInterval);

      alert(
        "Time is over. Your test will be submitted automatically."
      );

      finishExam();

    }

  }, 1000);

}


function updateTimer() {

  const minutes =
    Math.floor(remainingSeconds / 60);

  const seconds =
    remainingSeconds % 60;

  document.getElementById("timer").textContent =
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0");

}


/* SUBMIT */

function confirmSubmit() {

  const answered =
    Object.keys(answers).length;

  const unanswered =
    examQuestions.length - answered;

  const message =
    `Answered: ${answered}\n` +
    `Unanswered: ${unanswered}\n\n` +
    `Are you sure you want to submit?`;

  if (confirm(message)) {

    finishExam();

  }

}


/* FINISH */

function finishExam() {

  if (examFinished) return;

  examFinished = true;

  clearInterval(timerInterval);

  calculateResult();

}


/* RESULT */

function calculateResult() {

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  examQuestions.forEach((q, index) => {

    if (!answers[index]) {

      unanswered++;

    } else if (answers[index] === q.correct) {

      correct++;

    } else {

      wrong++;

    }

  });

  const score = correct;

  const percentage =
    ((score / 50) * 100).toFixed(2);

  const passed = score >= 38;

  document.getElementById("examScreen")
    .classList.add("hidden");

  document.getElementById("resultScreen")
    .classList.remove("hidden");

  document.getElementById("resultName")
    .textContent = student.name;

  document.getElementById("resultRoll")
    .textContent = student.roll;

  document.getElementById("score")
    .textContent = score;

  document.getElementById("correctCount")
    .textContent = correct;

  document.getElementById("wrongCount")
    .textContent = wrong;

  document.getElementById("unansweredCount")
    .textContent = unanswered;

  document.getElementById("percentage")
    .textContent = percentage + "%";

  const status =
    document.getElementById("resultStatus");

  status.textContent =
    passed ? "PASS" : "FAIL";

  status.className =
    passed ? "pass" : "fail";

  showReview();

}


/* REVIEW ANSWERS */

function showReview() {

  const area =
    document.getElementById("reviewArea");

  area.innerHTML =
    "<h2 style='text-align:center'>Answer Review</h2>";

  examQuestions.forEach((q, index) => {

    const item =
      document.createElement("div");

    const studentAnswer =
      answers[index] || "Not Answered";

    const isCorrect =
      studentAnswer === q.correct;

    item.className =
      "review-item " +
      (isCorrect
        ? "review-correct"
        : "review-wrong");

    item.innerHTML = `
      <b>Question ${index + 1}</b>
      <p>${escapeHtml(q.question)}</p>

      <p>
        <b>Your Answer:</b>
        ${escapeHtml(studentAnswer)}
      </p>

      <p>
        <b>Correct Answer:</b>
        ${escapeHtml(q.correct)}
      </p>
    `;

    area.appendChild(item);

  });

}


/* SHUFFLE */

function shuffle(array) {

  for (
    let i = array.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(Math.random() * (i + 1));

    [
      array[i],
      array[j]
    ] =
    [
      array[j],
      array[i]
    ];

  }

  return array;

}


/* SECURITY */

function enableExamSecurity() {

  document.addEventListener(
    "contextmenu",
    blockEvent
  );

  document.addEventListener(
    "copy",
    blockEvent
  );

  document.addEventListener(
    "cut",
    blockEvent
  );

  document.addEventListener(
    "paste",
    blockEvent
  );

  document.addEventListener(
    "keydown",
    securityKeys
  );

  document.addEventListener(
    "visibilitychange",
    visibilityWarning
  );

}


function blockEvent(e) {

  e.preventDefault();

}


function securityKeys(e) {

  if (
    e.ctrlKey ||
    e.metaKey ||
    e.key === "F12" ||
    e.key === "PrintScreen"
  ) {

    e.preventDefault();

  }

}


function visibilityWarning() {

  if (
    document.hidden &&
    !examFinished
  ) {

    console.log(
      "Exam window/tab was left."
    );

  }

}


/* ESCAPE HTML */

function escapeHtml(text) {

  const div =
    document.createElement("div");

  div.textContent =
    String(text);

  return div.innerHTML;

}


/* FULLSCREEN */

document.addEventListener(
  "fullscreenchange",
  () => {

    if (
      document.fullscreenElement === null &&
      !examFinished
    ) {

      console.log(
        "Fullscreen was exited."
      );

    }

  }
);
