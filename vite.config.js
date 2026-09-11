import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 的 project page 會掛在 /<repo 名稱>/ 底下，
// 所以 build 時要帶 base。改 repo 名稱時只要改這一行。
// 如果是掛在 <username>.github.io 根目錄，把 base 改成 "/"。
export default defineConfig({
  base: process.env.NODE_ENV === "production" ? "/graduation-credits/" : "/",
  plugins: [react()],
});
