const BOOKMARK_STATUS = Object.freeze({
  READING: "READING",
  PLAN_TO_READ: "PLAN_TO_READ",
  COMPLETED: "COMPLETED",
  DROPPED: "DROPPED",
  ON_HOLD: "ON_HOLD",
});
const BOOKMARK_STATUS_LABELS = Object.freeze({
  [BOOKMARK_STATUS.READING]: "O'qilmoqda",
  [BOOKMARK_STATUS.PLAN_TO_READ]: "O'qish rejalashtirilgan",
  [BOOKMARK_STATUS.COMPLETED]: "Tugallangan",
  [BOOKMARK_STATUS.DROPPED]: "Tashlab ketilgan",
  [BOOKMARK_STATUS.ON_HOLD]: "Kutish rejimida",
});

module.exports = {
  BOOKMARK_STATUS,
  BOOKMARK_STATUS_LABELS,
};
