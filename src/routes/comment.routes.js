const express = require("express");
const router = express.Router();
const commentController = require("../controllers/comment.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

const adminAuth = [protect, restrictTo("admin", "publisher")];

router.post("/:targetId", protect, commentController.createComment);
router.post("/:targetId/reply", protect, commentController.createReplyComment);
router.get("/:targetId", commentController.getComments);
router.get(
  "/:targetId/:parentId/replies",
  commentController.getRepliedComments,
);

router.delete('/:commentId', protect, commentController.deleteComment)

module.exports = router;
