const Application = require("../models/Application");
const User = require("../models/User");
const ApiResponse = require("../utils/response");

exports.getMyApplications = async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = { user: req.user.id };

    if (status && status !== "all") {
      const allowedStatuses = ["pending", "approved", "rejected"];

      if (allowedStatuses.includes(status)) {
        query.status = status;
      }
    }

    const applications = await Application.find(query).sort({ createdAt: -1 });

    return ApiResponse.success(res, applications, "Arizalar topildi", 200);
  } catch (error) {
    next(error);
  }
};

exports.submitTranslatorApplication = async (req, res, next) => {
  try {
    const existingApp = await Application.findOne({
      user: req.user.id,
      status: "pending",
      type: "translator",
    });

    if (existingApp) {
      return ApiResponse.error(
        res,
        "Sizda tarjimonlik bo'yicha ko'rib chiqilayotgan ariza mavjud.",
        400,
      );
    }

    const application = await Application.create({
      user: req.user.id,
      type: "translator",
      ...req.body,
    });

    ApiResponse.success(
      res,
      application,
      "Arizangiz qabul qilindi. Moderatorlar tez orada ko'rib chiqadi va sizga xabar beradi.",
      201,
    );
  } catch (error) {
    next(error);
  }
};

exports.submitApplication = async (req, res, next) => {
  try {
    const { type } = req.body;
    const existingApp = await Application.findOne({
      user: req.user.id,
      status: "pending",
      type: type,
    });

    if (existingApp) {
      return ApiResponse.error(
        res,
        "Sizda ko'rib chiqilayotgan ariza mavjud.",
        400,
      );
    }

    const application = await Application.create({
      user: req.user.id,
      ...req.body,
    });

    ApiResponse.success(
      res,
      application,
      "Arizangiz qabul qilindi. Moderatorlar tez orada ko'rib chiqadi.",
      201,
    );
  } catch (error) {
    next(error);
  }
};

// 2. Admin arizani tasdiqlashi yoki rad etishi
exports.reviewApplication = async (req, res, next) => {
  try {
    const { status, adminComment } = req.body;
    const application = await Application.findById(req.params.id);

    if (!application) {
      return ApiResponse.error(res, "Ariza topilmadi.", 404);
    }

    application.status = status;
    application.adminComment = adminComment;
    await application.save();

    // Agar tasdiqlansa, foydalanuvchi rolini o'zgartiramiz
    if (status === "approved") {
      await User.findByIdAndUpdate(application.user, { role: "translator" });
    }

    ApiResponse.success(
      res,
      application,
      `Ariza holati yangilandi: ${status}`,
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.getMyApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return ApiResponse.error(res, "Ariza topilmadi.", 404);
    }

    if (application.user.toString() !== req.user.id) {
      return ApiResponse.error(res, "Ariza topilmadi.", 404);
    }

    return ApiResponse.success(res, application, "Ariza topildi", 200);
  } catch (error) {
    next(error);
  }
};

exports.updateMyApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await Application.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!application) {
      return ApiResponse.error(res, "Ariza topilmadi", 404);
    }

    // 2. Statusni tekshirish
    if (application.status !== "pending") {
      return ApiResponse.error(
        res,
        "Ko'rib chiqilgan arizani tahrirlab bo'lmaydi.",
        400,
      );
    }

    const { name, portfolioLink, experience } = req.body;

    if (name !== undefined) application.name = name;
    if (portfolioLink !== undefined) application.portfolioLink = portfolioLink;
    if (experience !== undefined) application.experience = experience;

    await application.save();

    return ApiResponse.success(
      res,
      application,
      "Ariza muvaffaqiyatli yangilandi",
      200,
    );
  } catch (error) {
    next(error);
  }
};

exports.cancelMyApplication = async (req, res, next) => {
  try {
    const { id } = req.params;

    const application = await Application.findOne({
      _id: id,
      user: req.user.id,
    });

    if (!application) {
      return ApiResponse.error(res, "Ariza topilmadi", 404);
    }

    if (application.status !== "pending") {
      return ApiResponse.error(
        res,
        "Ko'rib chiqilgan arizani bekor qilib bo'lmaydi.",
        400,
      );
    }

    application.status = "cancelled";
    await application.save();

    return ApiResponse.success(
      res,
      application,
      "Ariza muvaffaqiyatli bekor qilindi",
      200,
    );
  } catch (error) {
    next(error);
  }
};
