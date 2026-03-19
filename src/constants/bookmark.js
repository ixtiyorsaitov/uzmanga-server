const BOOKMARK_STATUS = Object.freeze({
  READING: "reading",
  PLAN_TO_READ: "plan_to_read",
  COMPLETED: "completed",
  DROPPED: "dropped",
  ON_HOLD: "on_hold",
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
