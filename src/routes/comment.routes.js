const express = require("express");
const router = express.Router();
const commentController = require("../controllers/comment.controller");
const {
  protect,
  restrictTo,
  optionalProtect,
} = require("../middlewares/auth.middleware");

const adminAuth = [protect, restrictTo("admin", "publisher")];

router.post("/:targetId", protect, commentController.createComment);
router.post("/:targetId/reply", protect, commentController.createReplyComment);
router.put("/:commentId", protect, commentController.updateComment);
router.post("/:commentId/react", protect, commentController.toggleReaction);
router.delete("/:commentId", protect, commentController.deleteComment);

router.get("/:targetId", optionalProtect, commentController.getComments);
router.get(
  "/:targetId/:parentId/replies",
  optionalProtect,
  commentController.getRepliedComments,
);

module.exports = router;
