const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const uploadFolders = {
  MANGA_ASSETS: {
    bucket: "manga-assets",
    folders: {
      MANGA_COVERS: "manga_covers",
      MANGA_BANNERS: "manga_banners",
    },
  },
  MANGA_CHAPTERS: {
    bucket: "manga-chapters",
  },
};

class UploadService {
  async uploadToStorage(file, bucket, folder) {
    try {
      const fileExt = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      return {
        url: publicUrl,
        path: filePath,
        bucket,
      };
    } catch (error) {
      console.error("Supabase upload error:", error);
      throw new Error("Rasmni yuklashda xatolik yuz berdi");
    }
  }

  async deleteFromStorage(paths, bucket) {
    try {
      const pathsToDelete = Array.isArray(paths) ? paths : [paths];

      const { error } = await supabase.storage
        .from(bucket)
        .remove(pathsToDelete);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Supabase delete error:", error);
      throw new Error("Rasmni o'chirishda xatolik");
    }
  }
}

module.exports = {
  uploadService: new UploadService(),
  uploadFolders,
};
