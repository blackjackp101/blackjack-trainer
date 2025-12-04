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

function buildShoe(numDecks) {
  let shoe = [];
  for (let i = 0; i < numDecks; i++) {
    shoe = shoe.concat(buildDeck());
  }
  shuffle(shoe);
  return shoe;
}

function hiLoValue(rank) {
  if (["2", "3", "4", "5", "6"].includes(rank)) return 1;
  if (["7", "8", "9"].includes(rank)) return 0;
  return -1;
}

// -------- Strategy trainer --------
const handTypeSelect = document.getElementById("handType");
const playerValueSelect = document.getElementById("playerValue");
const dealerUpcardSelect = document.getElementById("dealerUpcard");
const playerActionSelect = document.getElementById("playerAction");
const checkMoveBtn = document.getElementById("checkMoveBtn");

const strategyResultBox = document.getElementById("strategy-result");
const strategyFeedback = document.getElementById("strategy-feedback");
const strategyExplanation = document.getElementById("strategy-explanation");

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

function dealerValue(card) {
  if (card === "A") return 11;
  return parseInt(card, 10);
}

function getRecommendation(handType, playerValue, dealerUp) {
  const d = dealerValue(dealerUp);

  if (handType === "pair") {
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

  const hardTotal = parseInt(playerValue, 10);

  if (hardTotal <= 11) {
    return { action: "Hit", reason: "You cannot bust with 11 or less, so hitting is always safe." };
  }

  if (hardTotal >= 12 && hardTotal <= 16) {
    if (d >= 2 && d <= 6) {
      return { action: "Stand", reason: "Let a weak dealer (2–6) draw and potentially bust while you hold your total." };
    }
    return { action: "Hit", reason: "Dealer 7–Ace is strong; improve your weak 12–16 by hitting." };
  }

  if (hardTotal >= 17) {
    return { action: "Stand", reason: "Hard 17+ is strong enough; hitting risks busting too often." };
  }

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

// -------- Counting trainer --------
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

startDrillBtn.addEventListener("click", startDrill);
nextCardBtn.addEventListener("click", showNextCard);
showCountBtn.addEventListener("click", showCurrentCount);
checkCountBtn.addEventListener("click", checkCountGuess);

// -------- Play vs Dealer (with split, running count, stats) --------
const newHandBtn = document.getElementById("newHandBtn");
const hitBtn = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");
const splitBtn = document.getElementById("splitBtn");

const dealerCardsEl = document.getElementById("dealerCards");
const dealerTotalEl = document.getElementById("dealerTotal");

const playerHandInfoEl = document.getElementById("playerHandInfo");
const hand1Wrapper = document.getElementById("hand1Wrapper");
const hand2Wrapper = document.getElementById("hand2Wrapper");
const playerCards1El = document.getElementById("playerCards1");
const playerTotal1El = document.getElementById("playerTotal1");
const playerCards2El = document.getElementById("playerCards2");
const playerTotal2El = document.getElementById("playerTotal2");

const playResultBox = document.getElementById("playResult");
const playFeedback = document.getElementById("playFeedback");

const shoeDecksSelect = document.getElementById("shoeDecks");
const revealPlayCountBtn = document.getElementById("revealPlayCountBtn");
const resetPlayCountBtn = document.getElementById("resetPlayCountBtn");
const playCountBox = document.getElementById("playCountBox");
const playCountText = document.getElementById("playCountText");
const playCountCardsEl = document.getElementById("playCountCards");

const playStatsText = document.getElementById("playStatsText");

let gameDeck = [];
let dealerHand = [];
let playerHands = [];   // array of hands
let currentHandIndex = 0;
let gameOver = false;
let dealerHoleCardHidden = true;
let splitUsed = false;

let playRunningCount = 0;
let playCountVisible = false;
let selectedDecks = parseInt(shoeDecksSelect.value, 10) || 6;
let playDealtCards = [];

// Stats
let totalHandsPlayed = 0;
let totalWins = 0;
let totalLosses = 0;
let totalPushes = 0;

function rankToValue(rank) {
  if (["J", "Q", "K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return parseInt(rank, 10);
}

function handValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    const val = rankToValue(card.rank);
    total += val;
    if (card.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function updateStatsUI() {
  if (!playStatsText) return;
  const decided = totalWins + totalLosses;
  const winRate = decided > 0 ? Math.round((totalWins / decided) * 100) : 0;
  playStatsText.textContent =
    `Hands: ${totalHandsPlayed} | ` +
    `Wins: ${totalWins} | Losses: ${totalLosses} | Pushes: ${totalPushes} | ` +
    `Win rate: ${winRate}%`;
}

function updatePlayCountUI() {
  if (!playCountVisible) return;

  playCountBox.classList.remove("hidden");

  const val = playRunningCount;
  const cardsDealt = playDealtCards.length;
  const totalCardsInShoe = selectedDecks * 52;
  const cardsRemaining = gameDeck.length;
  let decksRemainingText = "";

  if (selectedDecks >= 2 && totalCardsInShoe > 0) {
    const decksRemaining = cardsRemaining / 52;
    decksRemainingText = ` | Approx decks remaining: ${decksRemaining.toFixed(1)}`;
  }

  playCountText.textContent =
    `Running count for this shoe: ${val > 0 ? "+" + val : val} ` +
    `(Hi-Lo) | Cards dealt: ${cardsDealt}${decksRemainingText}`;

  playCountCardsEl.innerHTML = "";

  if (playDealtCards.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No cards dealt yet in this shoe.";
    playCountCardsEl.appendChild(empty);
    return;
  }

  const label = document.createElement("p");
  label.textContent = "Cards dealt in this shoe (in order):";
  playCountCardsEl.appendChild(label);

  const row = document.createElement("div");
  row.className = "play-count-card-row";

  playDealtCards.forEach((card) => {
    const span = document.createElement("span");
    span.className = "card-chip";
    span.textContent = `${card.rank}${card.suit}`;
    row.appendChild(span);
  });

  playCountCardsEl.appendChild(row);
}

function drawFromShoe() {
  if (gameDeck.length === 0) {
    gameDeck = buildShoe(selectedDecks);
    playRunningCount = 0;
    playDealtCards = [];
    updatePlayCountUI();
  }
  const card = gameDeck.pop();
  playRunningCount += hiLoValue(card.rank);
  playDealtCards.push(card);
  updatePlayCountUI();
  return card;
}

function renderDealer() {
  dealerCardsEl.innerHTML = "";

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

  if (dealerHoleCardHidden && !gameOver && dealerHand.length >= 2) {
    const visibleCard = dealerHand[0];
    const val = handValue([visibleCard]);
    dealerTotalEl.textContent = `Total showing: ${val}`;
  } else {
    const dealerTotal = handValue(dealerHand);
    dealerTotalEl.textContent = `Total: ${dealerTotal}`;
  }
}

function renderPlayerHands() {
  const hand1 = playerHands[0] || [];
  const hand2 = playerHands[1] || [];

  if (playerHands.length === 1) {
    playerHandInfoEl.textContent = "Single hand";
  } else {
    playerHandInfoEl.textContent = `Playing split hands (active: Hand ${currentHandIndex + 1})`;
  }

  playerCards1El.innerHTML = "";
  hand1.forEach((card) => {
    const span = document.createElement("span");
    span.className = "card-chip";
    span.textContent = `${card.rank}${card.suit}`;
    playerCards1El.appendChild(span);
  });
  playerTotal1El.textContent = hand1.length
    ? `Total: ${handValue(hand1)}`
    : "Total: —";

  if (playerHands.length > 1) {
    hand2Wrapper.classList.remove("hidden");
    playerCards2El.innerHTML = "";
    hand2.forEach((card) => {
      const span = document.createElement("span");
      span.className = "card-chip";
      span.textContent = `${card.rank}${card.suit}`;
      playerCards2El.appendChild(span);
    });
    playerTotal2El.textContent = hand2.length
      ? `Total: ${handValue(hand2)}`
      : "Total: —";
  } else {
    hand2Wrapper.classList.add("hidden");
    playerCards2El.innerHTML = "";
    playerTotal2El.textContent = "Total: —";
  }

  hand1Wrapper.classList.toggle("active-hand", currentHandIndex === 0);
  hand2Wrapper.classList.toggle("active-hand", currentHandIndex === 1);
}

function renderHands() {
  renderDealer();
  renderPlayerHands();
}

function canSplitCurrentHand() {
  if (gameOver) return false;
  if (splitUsed) return false;
  if (playerHands.length !== 1) return false;
  const hand = playerHands[0];
  if (!hand || hand.length !== 2) return false;
  return hand[0].rank === hand[1].rank;
}

function updateSplitButtonState() {
  splitBtn.disabled = !canSplitCurrentHand();
}

function resetRoundState() {
  playerHands = [[]];
  currentHandIndex = 0;
  dealerHand = [];
  gameOver = false;
  dealerHoleCardHidden = true;
  splitUsed = false;

  playResultBox.classList.add("hidden");
  playFeedback.textContent = "";

  if (!playCountVisible) {
    playCountBox.classList.add("hidden");
    playCountText.textContent = "";
    playCountCardsEl.innerHTML = "";
  }

  hitBtn.disabled = false;
  standBtn.disabled = false;
  updateSplitButtonState();
  renderHands();
}

function dealNewHand() {
  selectedDecks = parseInt(shoeDecksSelect.value, 10) || 6;

  if (gameDeck.length < 15) {
    gameDeck = buildShoe(selectedDecks);
    playRunningCount = 0;
    playDealtCards = [];
    updatePlayCountUI();
  }

  resetRoundState();

  playerHands[0].push(drawFromShoe());
  dealerHand.push(drawFromShoe());
  playerHands[0].push(drawFromShoe());
  dealerHand.push(drawFromShoe());

  renderHands();
  updateSplitButtonState();

  const total = handValue(playerHands[0]);
  if (total === 21) {
    dealerHoleCardHidden = false;
    gameOver = true;
    renderHands();
    playResultBox.classList.remove("hidden");
    playFeedback.textContent = "Blackjack! You have 21 on the deal.";

    totalHandsPlayed += 1;
    totalWins += 1;
    updateStatsUI();

    hitBtn.disabled = true;
    standBtn.disabled = true;
    splitBtn.disabled = true;
  }
}

function splitHand() {
  if (!canSplitCurrentHand()) return;

  const original = playerHands[0];
  const secondCard = original.pop();
  const newHand = [secondCard];

  original.push(drawFromShoe());
  newHand.push(drawFromShoe());

  playerHands = [original, newHand];
  currentHandIndex = 0;
  splitUsed = true;

  updateSplitButtonState();
  renderHands();
}

function playerHit() {
  if (gameOver) return;

  const hand = playerHands[currentHandIndex];
  hand.push(drawFromShoe());
  renderHands();

  const total = handValue(hand);
  if (total > 21) {
    playFeedback.textContent = `Hand ${currentHandIndex + 1} busts with ${total}.`;
    moveToNextHandOrDealer();
  }
}

function playerStand() {
  if (gameOver) return;

  const hand = playerHands[currentHandIndex];
  const total = handValue(hand);
  playFeedback.textContent = `Hand ${currentHandIndex + 1} stands on ${total}.`;
  moveToNextHandOrDealer();
}

function dealerPlay() {
  dealerHoleCardHidden = false;
  renderHands();

  let dealerTotal = handValue(dealerHand);
  while (dealerTotal < 17) {
    dealerHand.push(drawFromShoe());
    dealerTotal = handValue(dealerHand);
    renderHands();
  }
}

function resolveAfterDealer() {
  const dealerTotal = handValue(dealerHand);
  const msgs = [];
  const handsThisRound = playerHands.length;

  totalHandsPlayed += handsThisRound;

  playerHands.forEach((hand, index) => {
    const total = handValue(hand);

    if (total > 21) {
      totalLosses++;
      msgs.push(`Hand ${index + 1}: busts with ${total}. Dealer wins.`);
    } else if (dealerTotal > 21) {
      totalWins++;
      msgs.push(`Hand ${index + 1}: dealer busts with ${dealerTotal}. You win with ${total}.`);
    } else if (total > dealerTotal) {
      totalWins++;
      msgs.push(`Hand ${index + 1}: you win ${total} vs dealer ${dealerTotal}.`);
    } else if (total < dealerTotal) {
      totalLosses++;
      msgs.push(`Hand ${index + 1}: dealer wins ${dealerTotal} vs your ${total}.`);
    } else {
      totalPushes++;
      msgs.push(`Hand ${index + 1}: push at ${total}.`);
    }
  });

  playResultBox.classList.remove("hidden");
  playFeedback.innerHTML = msgs.join(" ");
  gameOver = true;
  hitBtn.disabled = true;
  standBtn.disabled = true;
  splitBtn.disabled = true;

  updateStatsUI();
}

function moveToNextHandOrDealer() {
  const numHands = playerHands.length;
  let nextIndex = currentHandIndex + 1;

  while (nextIndex < numHands && handValue(playerHands[nextIndex]) > 21) {
    nextIndex++;
  }

  if (nextIndex < numHands) {
    currentHandIndex = nextIndex;
    renderHands();
  } else {
    const anyLive = playerHands.some((hand) => handValue(hand) <= 21);
    if (anyLive) {
      dealerPlay();
      resolveAfterDealer();
    } else {
      // all hands busted
      dealerHoleCardHidden = false;
      renderHands();
      playResultBox.classList.remove("hidden");
      playFeedback.textContent = "All your hands bust. Dealer wins.";

      const handsThisRound = playerHands.length;
      totalHandsPlayed += handsThisRound;
      totalLosses += handsThisRound;
      updateStatsUI();

      gameOver = true;
      hitBtn.disabled = true;
      standBtn.disabled = true;
      splitBtn.disabled = true;
    }
  }
}

function togglePlayCountVisibility() {
  playCountVisible = !playCountVisible;

  if (playCountVisible) {
    revealPlayCountBtn.textContent = "Hide running count";
    updatePlayCountUI();
  } else {
    playCountBox.classList.add("hidden");
    playCountText.textContent = "";
    playCountCardsEl.innerHTML = "";
    revealPlayCountBtn.textContent = "Show running count";
  }
}

function resetPlayCount() {
  playRunningCount = 0;
  playDealtCards = [];
  updatePlayCountUI();
}

shoeDecksSelect.addEventListener("change", () => {
  selectedDecks = parseInt(shoeDecksSelect.value, 10) || 6;
  gameDeck = buildShoe(selectedDecks);
  playRunningCount = 0;
  playDealtCards = [];
  updatePlayCountUI();
});

newHandBtn.addEventListener("click", dealNewHand);
hitBtn.addEventListener("click", playerHit);
standBtn.addEventListener("click", playerStand);
splitBtn.addEventListener("click", splitHand);
revealPlayCountBtn.addEventListener("click", togglePlayCountVisibility);
resetPlayCountBtn.addEventListener("click", resetPlayCount);

revealPlayCountBtn.textContent = "Show running count";
updateStatsUI();
