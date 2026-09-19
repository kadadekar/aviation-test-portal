// ======================================================
// AVIATION TEST PORTAL - APP.JS
// ======================================================

const API_URL =
  "https://aviation-test-api.govapi838.workers.dev";


// ======================================================
// GLOBAL VARIABLES
// ======================================================

let questions = [];

let currentQuestion = 0;

let answers = {};

let reviewQuestions = {};

let sessionId = null;

let examExpiresAt = null;

let timerInterval = null;

let examSubmitted = false;


// ======================================================
// START EXAM
// ======================================================

async function startExam() {

  const name =
    document
      .getElementById("studentName")
      .value
      .trim();

  const rollNo =
    document
      .getElementById("rollNo")
      .value
      .trim();

  const batch =
    document
      .getElementById("batch")
      .value
      .trim();

  const email =
    document
      .getElementById("email")
      .value
      .trim();


  // ------------------------------------------
  // VALIDATION
  // ------------------------------------------

  if (!name || !rollNo || !batch || !email) {

    alert(
      "Please enter Student Name, Roll Number, Batch and Email."
    );

    return;

  }


  // ------------------------------------------
  // EMAIL VALIDATION
  // ------------------------------------------

  const emailPattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {

    alert(
      "Please enter a valid email address."
    );

    return;

  }


  try {

    // ----------------------------------------
    // DISABLE START BUTTON
    // ----------------------------------------

    const startButton =
      document.querySelector(
        "#startScreen .primary-btn"
      );

    if (startButton) {

      startButton.disabled = true;

      startButton.textContent =
        "STARTING EXAM...";

    }


    // ----------------------------------------
    // CREATE EXAM SESSION
    // ----------------------------------------

    const startResponse =
      await fetch(
        `${API_URL}/api/start`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              name: name,
              rollNo: rollNo,
              batch: batch,
              email: email
            })
        }
      );


    const startData =
      await startResponse.json();


    if (
      !startResponse.ok ||
      startData.status !== "success"
    ) {

      throw new Error(
        startData.message ||
        "Unable to start exam."
      );

    }


    // ----------------------------------------
    // SAVE SESSION INFORMATION
    // ----------------------------------------

    sessionId =
      startData.sessionId;

    examExpiresAt =
      startData.expiresAt;


    // ----------------------------------------
    // LOAD QUESTIONS
    // ----------------------------------------

    const questionResponse =
      await fetch(
        `${API_URL}/api/questions`
      );


    const questionData =
      await questionResponse.json();


    if (
      !questionResponse.ok ||
      questionData.status !== "success"
    ) {

      throw new Error(
        questionData.message ||
        "Unable to load questions."
      );

    }


    questions =
      questionData.questions || [];


    if (
      questions.length !== 50
    ) {

      throw new Error(
        "The exam did not load all 50 questions."
      );

    }


    // ----------------------------------------
    // RESET EXAM STATE
    // ----------------------------------------

    currentQuestion = 0;

    answers = {};

    reviewQuestions = {};

    examSubmitted = false;


    // ----------------------------------------
    // SHOW EXAM SCREEN
    // ----------------------------------------

    document
      .getElementById("startScreen")
      .classList
      .add("hidden");

    document
      .getElementById("resultScreen")
      .classList
      .add("hidden");

    document
      .getElementById("examScreen")
      .classList
      .remove("hidden");


    // ----------------------------------------
    // BUILD QUESTION PALETTE
    // ----------------------------------------

    buildQuestionPalette();


    // ----------------------------------------
    // DISPLAY FIRST QUESTION
    // ----------------------------------------

    showQuestion();


    // ----------------------------------------
    // START TIMER
    // ----------------------------------------

    startTimer();

  } catch (error) {

    console.error(error);

    alert(
      error.message ||
      "Unable to start the exam."
    );


    const startButton =
      document.querySelector(
        "#startScreen .primary-btn"
      );

    if (startButton) {

      startButton.disabled = false;

      startButton.textContent =
        "START EXAM";

    }

  }

}


// ======================================================
// SHOW QUESTION
// ======================================================

function showQuestion() {

  if (!questions.length) {
    return;
  }


  const q =
    questions[currentQuestion];


  // ------------------------------------------
  // QUESTION NUMBER
  // ------------------------------------------

  document
    .getElementById("questionNumber")
    .textContent =
      `Question ${currentQuestion + 1} of ${questions.length}`;


  // ------------------------------------------
  // LEVEL
  // ------------------------------------------

  document
    .getElementById("levelBadge")
    .textContent =
      `LEVEL ${q.level}`;


  // ------------------------------------------
  // QUESTION TEXT
  // ------------------------------------------

  document
    .getElementById("questionText")
    .textContent =
      q.question;


  // ------------------------------------------
  // OPTIONS
  // ------------------------------------------

  const optionsContainer =
    document.getElementById("options");


  optionsContainer.innerHTML = "";


  q.options.forEach(
    (option, index) => {

      const label =
        document.createElement("label");

      label.className =
        "option";


      const radio =
        document.createElement("input");

      radio.type =
        "radio";

      radio.name =
        "questionOption";

      radio.value =
        option;


      // --------------------------------------
      // RESTORE ANSWER
      // --------------------------------------

      if (
        answers[String(q.id)] ===
        option
      ) {

        radio.checked = true;

      }


      // --------------------------------------
      // ANSWER CHANGE
      // --------------------------------------

      radio.addEventListener(
        "change",
        function () {

          answers[String(q.id)] =
            option;

          updateQuestionPalette();

        }
      );


      const text =
        document.createElement("span");

      text.textContent =
        option;


      label.appendChild(radio);

      label.appendChild(text);

      optionsContainer.appendChild(label);

    }
  );


  // ------------------------------------------
  // PREVIOUS BUTTON
  // ------------------------------------------

  const previousButton =
    document.getElementById(
      "previousBtn"
    );


  previousButton.disabled =
    currentQuestion === 0;


  // ------------------------------------------
  // NEXT BUTTON
  // ------------------------------------------

  const nextButton =
    document.getElementById(
      "nextBtn"
    );


  if (
    currentQuestion ===
    questions.length - 1
  ) {

    nextButton.textContent =
      "Finish →";

  } else {

    nextButton.textContent =
      "Next →";

  }


  // ------------------------------------------
  // PALETTE
  // ------------------------------------------

  updateQuestionPalette();

}


// ======================================================
// NEXT QUESTION
// ======================================================

function nextQuestion() {

  if (
    currentQuestion <
    questions.length - 1
  ) {

    currentQuestion++;

    showQuestion();

  } else {

    confirmSubmit();

  }

}


// ======================================================
// PREVIOUS QUESTION
// ======================================================

function previousQuestion() {

  if (
    currentQuestion > 0
  ) {

    currentQuestion--;

    showQuestion();

  }

}


// ======================================================
// CLEAR ANSWER
// ======================================================

function clearAnswer() {

  const q =
    questions[currentQuestion];


  delete answers[
    String(q.id)
  ];


  showQuestion();

}


// ======================================================
// MARK FOR REVIEW
// ======================================================

function toggleReview() {

  const q =
    questions[currentQuestion];


  const id =
    String(q.id);


  reviewQuestions[id] =
    !reviewQuestions[id];


  updateQuestionPalette();

}


// ======================================================
// QUESTION PALETTE
// ======================================================

function buildQuestionPalette() {

  const palette =
    document.getElementById(
      "questionPalette"
    );


  palette.innerHTML = "";


  questions.forEach(
    (q, index) => {

      const button =
        document.createElement("button");


      button.type =
        "button";


      button.textContent =
        index + 1;


      button.className =
        "palette-question";


      button.addEventListener(
        "click",
        function () {

          currentQuestion =
            index;

          showQuestion();

        }
      );


      palette.appendChild(button);

    }
  );

}


// ======================================================
// UPDATE QUESTION PALETTE
// ======================================================

function updateQuestionPalette() {

  const buttons =
    document.querySelectorAll(
      ".palette-question"
    );


  buttons.forEach(
    (button, index) => {

      const q =
        questions[index];


      const id =
        String(q.id);


      button.classList.remove(
        "answered",
        "review",
        "current",
        "unanswered"
      );


      if (
        index === currentQuestion
      ) {

        button.classList.add(
          "current"
        );

      }


      if (
        answers[id] !== undefined
      ) {

        button.classList.add(
          "answered"
        );

      } else {

        button.classList.add(
          "unanswered"
        );

      }


      if (
        reviewQuestions[id]
      ) {

        button.classList.add(
          "review"
        );

      }

    }
  );

}


// ======================================================
// TIMER
// ======================================================

function startTimer() {

  clearInterval(
    timerInterval
  );


  function updateTimer() {

    if (
      examSubmitted
    ) {

      clearInterval(
        timerInterval
      );

      return;

    }


    const remaining =
      examExpiresAt -
      Date.now();


    if (
      remaining <= 0
    ) {

      document
        .getElementById("timer")
        .textContent =
          "00:00";


      clearInterval(
        timerInterval
      );


      autoSubmitExam();

      return;

    }


    const totalSeconds =
      Math.floor(
        remaining / 1000
      );


    const minutes =
      Math.floor(
        totalSeconds / 60
      );


    const seconds =
      totalSeconds % 60;


    document
      .getElementById("timer")
      .textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  }


  updateTimer();


  timerInterval =
    setInterval(
      updateTimer,
      1000
    );

}


// ======================================================
// CONFIRM SUBMIT
// ======================================================

function confirmSubmit() {

  if (
    examSubmitted
  ) {

    return;

  }


  const answered =
    Object.keys(
      answers
    ).length;


  const unanswered =
    questions.length -
    answered;


  const message =
    `Are you sure you want to submit the test?\n\n` +
    `Answered: ${answered}\n` +
    `Unanswered: ${unanswered}\n\n` +
    `Click OK to submit.`;


  if (
    confirm(message)
  ) {

    submitExam();

  }

}


// ======================================================
// AUTO SUBMIT
// ======================================================

function autoSubmitExam() {

  if (
    examSubmitted
  ) {

    return;

  }


  alert(
    "Time is over. Your test will be submitted automatically."
  );


  submitExam();

}


// ======================================================
// SUBMIT EXAM
// ======================================================

async function submitExam() {

  if (
    examSubmitted
  ) {

    return;

  }


  if (
    !sessionId
  ) {

    alert(
      "Exam session is missing. Please contact the administrator."
    );

    return;

  }


  examSubmitted = true;


  clearInterval(
    timerInterval
  );


  try {

    // ----------------------------------------
    // DISABLE SUBMIT BUTTONS
    // ----------------------------------------

    const submitButtons =
      document.querySelectorAll(
        ".submit-btn, #nextBtn"
      );


    submitButtons.forEach(
      button => {

        button.disabled = true;

      }
    );


    // ----------------------------------------
    // SEND ANSWERS TO SERVER
    // ----------------------------------------

    const response =
      await fetch(
        `${API_URL}/api/submit`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              sessionId:
                sessionId,

              answers:
                answers

            })
        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      data.status !== "success"
    ) {

      // Allow retry if submission failed
      examSubmitted = false;

      alert(
        data.message ||
        "Unable to submit exam."
      );

      return;

    }


    // ----------------------------------------
    // SHOW RESULT
    // ----------------------------------------

    showResult(data);

  } catch (error) {

    console.error(error);

    examSubmitted = false;

    alert(
      "Network error. Please try submitting again."
    );

  }

}


// ======================================================
// SHOW RESULT
// ======================================================

function showResult(data) {

  document
    .getElementById("examScreen")
    .classList
    .add("hidden");


  document
    .getElementById("resultScreen")
    .classList
    .remove("hidden");


  // ------------------------------------------
  // RESULT STATUS
  // ------------------------------------------

  const status =
    document.getElementById(
      "resultStatus"
    );


  status.textContent =
    data.result;


  status.className =
    data.result === "PASS"
      ? "pass"
      : "fail";


  // ------------------------------------------
  // SCORE
  // ------------------------------------------

  document
    .getElementById("score")
    .textContent =
      data.score;


  // ------------------------------------------
  // STUDENT
  // ------------------------------------------

  document
    .getElementById("resultName")
    .textContent =
      data.studentName;


  document
    .getElementById("resultRoll")
    .textContent =
      data.rollNo;


  // ------------------------------------------
  // CORRECT
  // ------------------------------------------

  const correct =
    data.review.filter(
      item =>
        item.correct
    ).length;


  // ------------------------------------------
  // WRONG
  // ------------------------------------------

  const wrong =
    data.review.filter(
      item =>
        !item.correct &&
        item.yourAnswer !== null
    ).length;


  // ------------------------------------------
  // UNANSWERED
  // ------------------------------------------

  const unanswered =
    data.review.filter(
      item =>
        item.yourAnswer === null
    ).length;


  document
    .getElementById("correctCount")
    .textContent =
      correct;


  document
    .getElementById("wrongCount")
    .textContent =
      wrong;


  document
    .getElementById("unansweredCount")
    .textContent =
      unanswered;


  // ------------------------------------------
  // PERCENTAGE
  // ------------------------------------------

  document
    .getElementById("percentage")
    .textContent =
      `${data.percentage}%`;


  // ------------------------------------------
  // SAVE REVIEW DATA
  // ------------------------------------------

  window.examReview =
    data.review;

}


// ======================================================
// SHOW ANSWERS
// ======================================================

function showReview() {

  const reviewArea =
    document.getElementById(
      "reviewArea"
    );


  reviewArea.innerHTML = "";


  if (
    !window.examReview
  ) {

    return;

  }


  window.examReview.forEach(
    (item, index) => {

      const card =
        document.createElement("div");


      card.className =
        "card review-card";


      const title =
        document.createElement("h3");


      title.textContent =
        `Question ${index + 1}`;


      const question =
        document.createElement("p");


      question.textContent =
        item.question;


      const yourAnswer =
        document.createElement("p");


      yourAnswer.innerHTML =
        "<strong>Your Answer:</strong> " +
        escapeHtml(
          item.yourAnswer === null
            ? "Not Answered"
            : item.yourAnswer
        );


      const correctAnswer =
        document.createElement("p");


      correctAnswer.innerHTML =
        "<strong>Correct Answer:</strong> " +
        escapeHtml(
          item.correctAnswer
        );


      const reason =
        document.createElement("p");


      reason.innerHTML =
        "<strong>Explanation:</strong> " +
        escapeHtml(
          item.reason || ""
        );


      card.appendChild(title);

      card.appendChild(question);

      card.appendChild(yourAnswer);

      card.appendChild(correctAnswer);

      card.appendChild(reason);


      reviewArea.appendChild(card);

    }
  );

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(value) {

  const div =
    document.createElement("div");


  div.textContent =
    value;


  return div.innerHTML;

}


// ======================================================
// BASIC ANTI-CHEAT
// ======================================================

// Disable right click

document.addEventListener(
  "contextmenu",
  function (event) {

    if (
      !document
        .getElementById("examScreen")
        .classList
        .contains("hidden")
    ) {

      event.preventDefault();

    }

  }
);


// Disable common keyboard shortcuts

document.addEventListener(
  "keydown",
  function (event) {

    const examScreen =
      document.getElementById(
        "examScreen"
      );


    if (
      examScreen.classList.contains(
        "hidden"
      )
    ) {

      return;

    }


    // Ctrl+C

    if (
      event.ctrlKey &&
      event.key.toLowerCase() === "c"
    ) {

      event.preventDefault();

    }


    // Ctrl+U

    if (
      event.ctrlKey &&
      event.key.toLowerCase() === "u"
    ) {

      event.preventDefault();

    }


    // Ctrl+S

    if (
      event.ctrlKey &&
      event.key.toLowerCase() === "s"
    ) {

      event.preventDefault();

    }


    // F12

    if (
      event.key === "F12"
    ) {

      event.preventDefault();

    }


    // Ctrl+Shift+I

    if (
      event.ctrlKey &&
      event.shiftKey &&
      event.key.toLowerCase() === "i"
    ) {

      event.preventDefault();

    }


    // Ctrl+Shift+J

    if (
      event.ctrlKey &&
      event.shiftKey &&
      event.key.toLowerCase() === "j"
    ) {

      event.preventDefault();

    }

  }
);


// ======================================================
// PREVENT ACCIDENTAL PAGE EXIT
// ======================================================

window.addEventListener(
  "beforeunload",
  function (event) {

    const examScreen =
      document.getElementById(
        "examScreen"
      );


    if (
      examScreen &&
      !examScreen.classList.contains(
        "hidden"
      ) &&
      !examSubmitted
    ) {

      event.preventDefault();

      event.returnValue = "";

    }

  }
);
