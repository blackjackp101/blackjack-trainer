// -------- Tab switching --------
const tabButtons = document.querySelectorAll(".tab-button");
const tabSections = document.querySelectorAll(".tab-section");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");

    tabButtons.forEach((b) => b.classList.remove("active"));
    tabSections.forEach((section) => section.classList.remove("active"));

    btn.classList.add("active");
    document.getElementById(tab).classList.add("active");
  });
});

// -------- Shared helpers: deck + shuffle --------
function buildDeck() {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const suits = ["♠", "♥", "♦", "♣"];
  const cards = [];
  for (const r of ranks) {
    for (const s of suits) {
      cards.push({ rank: r, suit: s });
    }
  }
  return cards;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// -------- Strategy trainer setup --------
const handTypeSelect = document.getElementById("handType");
const playerValueSelect = document.getElementById("playerValue");
const dealerUpcardSelect = document.getElementById("dealerUpcard");
const playerActionSelect = document.getElementById("playerAction");
const checkMoveBtn = document.getElementById("checkMoveBtn");

const strategyResultBox = document.getElementById("strategy-result");
const strategyFeedback = document.getElementById("strategy-feedback");
const strategyExplanation = document.getElementById("strategy-explanation");

// populate player values depending on hand type
function populatePlayerValues() {
  const type = handTypeSelect.value;
  playerValueSelect.innerHTML = "";

  if (type === "hard") {
    for (let total = 5; total <= 20; total++) {
      const opt = document.createElement("option");
      opt.value = String(total);
      opt.textContent = `Hard ${total}`;
      playerValueSelect.appendChild(opt);
    }
  } else if (type === "soft") {
    const softHands = [
      "A,2",
      "A,3",
      "A,4",
      "A,5",
      "A,6",
      "A,7",
      "A,8",
      "A,9",
      "A,10",
    ];
    softHands.forEach((hand) => {
      const opt = document.createElement("option");
      opt.value = hand;
      opt.textContent = `Soft ${hand.replace("A,", "A-")}`;
      playerValueSelect.appendChild(opt);
    });
  } else if (type === "pair") {
    const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    ranks.forEach((r) => {
      const opt = document.createElement("option");
      opt.value = `${r},${r}`;
      opt.textContent = `Pair ${r},${r}`;
      playerValueSelect.appendChild(opt);
    });
  }
}

handTypeSelect.addEventListener("change", populatePlayerValues);
populatePlayerValues();

// Helper: parse dealer upcard to a numeric-ish value
function dealerValue(card) {
  if (card === "A") return 11;
  return parseInt(card, 10);
}

// Strategy logic: returns { action, reason }
function getRecommendation(handType, playerValue, dealerUp) {
  const d = dealerValue(dealerUp);

  if (handType === "pair") {
    // pair logic
    switch (playerValue) {
      case "A,A":
        return { action: "Split", reason: "Always split aces to start two strong hands." };
      case "8,8":
        return { action: "Split", reason: "Always split eights to avoid a hard 16, which is a weak hand." };
      case "2,2":
      case "3,3":
        if (d >= 4 && d <= 7) {
          return { action: "Split", reason: "Splitting small pairs vs a weak dealer improves your edge." };
        }
        return { action: "Hit", reason: "Small pairs vs stronger dealer hands should be played as regular hands." };
      case "4,4":
        if (d === 5 || d === 6) {
          return { action: "Split", reason: "Splitting 4s vs 5 or 6 can be profitable, otherwise hit." };
        }
        return { action: "Hit", reason: "Treat 4s as a weak hand and hit." };
      case "5,5":
        if (d >= 2 && d <= 9) {
          return { action: "Double", reason: "10 vs 2–9 is a great spot to double, never split 5s." };
        }
        return { action: "Hit", reason: "Hit against strong dealer upcards instead of splitting 5s." };
      case "6,6":
        if (d >= 2 && d <= 6) {
          return { action: "Split", reason: "Splitting 6s vs 2–6 puts more money out when dealer is weak." };
        }
        return { action: "Hit", reason: "Hit when the dealer shows a strong card." };
      case "7,7":
        if (d >= 2 && d <= 7) {
          return { action: "Split", reason: "Splitting 7s vs 2–7 is good, as the dealer is more likely to bust." };
        }
        return { action: "Hit", reason: "Hit when the dealer has the advantage." };
      case "9,9":
        if (d === 7 || d === 10 || d === 11) {
          return { action: "Stand", reason: "19 is already very strong vs 7, 10, or Ace; just stand." };
        }
        return { action: "Split", reason: "Split 9s vs most dealer cards to improve your average result." };
      case "10,10":
      case "J,J":
      case "Q,Q":
      case "K,K":
        return { action: "Stand", reason: "20 is one of the best totals; splitting would weaken your position." };
      default:
        return { action: "Hit", reason: "For less common pairs, a safe default is to hit." };
    }
  }

  if (handType === "soft") {
    const parts = playerValue.split(",");
    const second = parts[1];
    const secondVal = second === "10" ? 10 : parseInt(second, 10);
    const softTotal = 11 + secondVal;

    if (softTotal <= 17) {
      if (d >= 4 && d <= 6) {
        return { action: "Double", reason: "Soft totals 13–17 vs 4–6 are good double-down spots." };
      }
      return { action: "Hit", reason: "Soft low totals give you room to hit without much bust risk." };
    }

    if (softTotal === 18) {
      if (d >= 3 && d <= 6) {
        return { action: "Double", reason: "Soft 18 vs 3–6 is strong and worth doubling." };
      }
      if (d === 2 || d === 7 || d === 8) {
        return { action: "Stand", reason: "Soft 18 is fine as-is vs a medium dealer card." };
      }
      return { action: "Hit", reason: "Soft 18 vs 9, 10, or Ace needs aggression; hit." };
    }

    if (softTotal >= 19) {
      return { action: "Stand", reason: "Soft 19+ is strong; standing is usually best." };
    }
  }

  // Hard hands
  const hardTotal = parseInt(playerValue, 10);

  // Always hit 11 or less
  if (hardTotal <= 11) {
    return { action: "Hit", reason: "You cannot bust with 11 or less, so hitting is always safe." };
  }

  // 12–16: stand vs 2–6, otherwise hit
  if (hardTotal >= 12 && hardTotal <= 16) {
    if (d >= 2 && d <= 6) {
      return {
        action: "Stand",
        reason: "Let a weak dealer (2–6) draw and potentially bust while you hold your total.",
      };
    }
    return {
      action: "Hit",
      reason: "Dealer 7–Ace is strong; improve your weak 12–16 by hitting.",
    };
  }

  // 17+ stand
  if (hardTotal >= 17) {
    return { action: "Stand", reason: "Hard 17+ is strong enough; hitting risks busting too often." };
  }

  // Fallback
  return { action: "Hit", reason: "When in doubt with a low total, hitting is safer." };
}

checkMoveBtn.addEventListener("click", () => {
  const handType = handTypeSelect.value;
  const playerValue = playerValueSelect.value;
  const dealerUp = dealerUpcardSelect.value;
  const playerAction = playerActionSelect.value;

  const { action, reason } = getRecommendation(handType, playerValue, dealerUp);

  strategyResultBox.classList.remove("hidden");
  strategyExplanation.textContent = reason;

  if (playerAction === action) {
    strategyFeedback.textContent = `Correct! Basic strategy recommends: ${action}.`;
  } else {
    strategyFeedback.textContent = `Not quite. Basic strategy recommends: ${action}.`;
  }
});

// -------- Card counting trainer --------
const startDrillBtn = document.getElementById("startDrillBtn");
const nextCardBtn = document.getElementById("nextCardBtn");
const showCountBtn = document.getElementById("showCountBtn");
const currentCardEl = document.getElementById("currentCard");
const guessArea = document.getElementById("guess-area");
const countGuessInput = document.getElementById("countGuess");
const checkCountBtn = document.getElementById("checkCountBtn");
const countResultBox = document.getElementById("count-result");
const countFeedback = document.getElementById("count-feedback");

let countingDeck = [];
let drillCards = [];
let drillIndex = 0;
let runningCount = 0;

function hiLoValue(rank) {
  if (["2", "3", "4", "5", "6"].includes(rank)) return 1;
  if (["7", "8", "9"].includes(rank)) return 0;
  return -1; // 10, J, Q, K, A
}

function startDrill() {
  countingDeck = buildDeck();
  shuffle(countingDeck);
  drillCards = countingDeck.slice(0, 20);
  drillIndex = 0;
  runningCount = 0;

  currentCardEl.textContent = "—";
  guessArea.classList.add("hidden");
  countResultBox.classList.add("hidden");
  countGuessInput.value = "";

  nextCardBtn.disabled = false;
  showCountBtn.disabled = false;

  countFeedback.textContent = "";
}

function showNextCard() {
  if (drillIndex >= drillCards.length) {
    nextCardBtn.disabled = true;
    guessArea.classList.remove("hidden");
    return;
  }

  const card = drillCards[drillIndex];
  currentCardEl.textContent = `${card.rank}${card.suit}`;
  runningCount += hiLoValue(card.rank);
  drillIndex++;

  if (drillIndex >= drillCards.length) {
    nextCardBtn.disabled = true;
    guessArea.classList.remove("hidden");
  }
}

function showCurrentCount() {
  countResultBox.classList.remove("hidden");
  countFeedback.textContent = `Current running count (answer): ${
    runningCount > 0 ? "+" + runningCount : runningCount
  }`;
}

function checkCountGuess() {
  const guess = parseInt(countGuessInput.value, 10);
  if (Number.isNaN(guess)) {
    countResultBox.classList.remove("hidden");
    countFeedback.textContent = "Please enter a number for your guess.";
    return;
  }

  const correct = runningCount;
  countResultBox.classList.remove("hidden");

  if (guess === correct) {
    countFeedback.textContent = `Spot on! The running count is ${
      correct > 0 ? "+" + correct : correct
    }.`;
  } else {
    countFeedback.textContent = `Close. Your answer: ${
      guess > 0 ? "+" + guess : guess
    }, correct answer: ${correct > 0 ? "+" + correct : correct}.`;
  }
}

// Wire up counting events
startDrillBtn.addEventListener("click", startDrill);
nextCardBtn.addEventListener("click", showNextCard);
showCountBtn.addEventListener("click", showCurrentCount);
checkCountBtn.addEventListener("click", checkCountGuess);

// -------- Play vs Dealer game --------
const newHandBtn = document.getElementById("newHandBtn");
const hitBtn = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");

const dealerCardsEl = document.getElementById("dealerCards");
const playerCardsEl = document.getElementById("playerCards");
const dealerTotalEl = document.getElementById("dealerTotal");
const playerTotalEl = document.getElementById("playerTotal");
const playResultBox = document.getElementById("playResult");
const playFeedback = document.getElementById("playFeedback");

let gameDeck = [];
let playerHand = [];
let dealerHand = [];
let gameOver = false;
let dealerHoleCardHidden = true;

// Convert rank to numeric for hand value
function rankToValue(rank) {
  if (["J", "Q", "K"].includes(rank)) return 10;
  if (rank === "A") return 11; // initially count as 11, adjust later
  return parseInt(rank, 10);
}

// Compute hand total with Ace adjustment
function handValue(hand) {
  let total = 0;
  let aces = 0;

  for (const card of hand) {
    const val = rankToValue(card.rank);
    total += val;
    if (card.rank === "A") aces++;
  }

  while (total > 21 && aces > 0) {
    total -= 10; // turn an Ace from 11 -> 1
    aces--;
  }

  return total;
}

function drawCard() {
  if (gameDeck.length === 0) {
    gameDeck = buildDeck();
    shuffle(gameDeck);
  }
  return gameDeck.pop();
}

function renderHands() {
  dealerCardsEl.innerHTML = "";
  playerCardsEl.innerHTML = "";

  dealerHand.forEach((card, index) => {
    const span = document.createElement("span");
    span.className = "card-chip";

    if (index === 1 && dealerHoleCardHidden && !gameOver) {
      span.textContent = "??";
    } else {
      span.textContent = `${card.rank}${card.suit}`;
    }

    dealerCardsEl.appendChild(span);
  });

  playerHand.forEach((card) => {
    const span = document.createElement("span");
    span.className = "card-chip";
    span.textContent = `${card.rank}${card.suit}`;
    playerCardsEl.appendChild(span);
  });

  const playerTotal = handValue(playerHand);
  playerTotalEl.textContent = `Total: ${playerTotal}`;

  if (dealerHoleCardHidden && !gameOver && dealerHand.length >= 2) {
    const visibleCard = dealerHand[0];
    const val = handValue([visibleCard]);
    dealerTotalEl.textContent = `Total showing: ${val}`;
  } else {
    const dealerTotal = handValue(dealerHand);
    dealerTotalEl.textContent = `Total: ${dealerTotal}`;
  }
}

function resetGameState() {
  if (gameDeck.length < 15) {
    gameDeck = buildDeck();
    shuffle(gameDeck);
  }

  playerHand = [];
  dealerHand = [];
  gameOver = false;
  dealerHoleCardHidden = true;

  playResultBox.classList.add("hidden");
  playFeedback.textContent = "";

  hitBtn.disabled = false;
  standBtn.disabled = false;
}

function dealNewHand() {
  if (gameDeck.length < 15) {
    gameDeck = buildDeck();
    shuffle(gameDeck);
  }

  resetGameState();

  playerHand.push(drawCard());
  dealerHand.push(drawCard());
  playerHand.push(drawCard());
  dealerHand.push(drawCard());

  renderHands();

  const playerTotal = handValue(playerHand);
  if (playerTotal === 21) {
    dealerHoleCardHidden = false;
    gameOver = true;
    renderHands();
    playResultBox.classList.remove("hidden");
    playFeedback.textContent = "Blackjack! You have 21 on the deal.";
    hitBtn.disabled = true;
    standBtn.disabled = true;
  }
}

function playerHit() {
  if (gameOver) return;

  playerHand.push(drawCard());
  renderHands();

  const total = handValue(playerHand);
  if (total > 21) {
    dealerHoleCardHidden = false;
    gameOver = true;
    renderHands();
    playResultBox.classList.remove("hidden");
    playFeedback.textContent = "You bust! Dealer wins.";
    hitBtn.disabled = true;
    standBtn.disabled = true;
  }
}

function dealerPlay() {
  dealerHoleCardHidden = false;
  renderHands();

  let dealerTotal = handValue(dealerHand);
  while (dealerTotal < 17) {
    dealerHand.push(drawCard());
    dealerTotal = handValue(dealerHand);
    renderHands();
  }
}

function resolveHand() {
  if (gameOver) return;

  dealerPlay();

  const playerTotal = handValue(playerHand);
  const dealerTotal = handValue(dealerHand);

  gameOver = true;
  playResultBox.classList.remove("hidden");

  if (dealerTotal > 21) {
    playFeedback.textContent = `Dealer busts with ${dealerTotal}. You win with ${playerTotal}!`;
  } else if (dealerTotal > playerTotal) {
    playFeedback.textContent = `Dealer wins ${dealerTotal} vs your ${playerTotal}.`;
  } else if (dealerTotal < playerTotal) {
    playFeedback.textContent = `You win! ${playerTotal} vs dealer's ${dealerTotal}.`;
  } else {
    playFeedback.textContent = `Push: both you and the dealer have ${playerTotal}.`;
  }

  hitBtn.disabled = true;
  standBtn.disabled = true;
}

// Wire up play vs dealer buttons
newHandBtn.addEventListener("click", () => {
  gameDeck = gameDeck.length ? gameDeck : buildDeck();
  if (!gameDeck.length) {
    gameDeck = buildDeck();
  }
  shuffle(gameDeck);
  dealNewHand();
});

hitBtn.addEventListener("click", playerHit);
standBtn.addEventListener("click", resolveHand);
