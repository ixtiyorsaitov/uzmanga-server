const slugify = require("slugify");

exports.generateSlug = (title, customSlug) => {
  return slugify(customSlug || title, { lower: true, strict: true });
};

exports.parseAndValidateIds = async (Model, data) => {
  if (!data) return [];
  const ids = Array.isArray(data) ? data : JSON.parse(data);

  const count = await Model.countDocuments({ _id: { $in: ids } });
  if (count !== ids.length) {
    throw new Error(`Ba'zi ${Model.modelName} IDlari topilmadi`);
  }
  return ids;
};
