import { describe, expect, it } from "vitest";
import { toArabicError } from "../lib/arabic-errors";

describe("Arabic error messages", () => {
  it("يستبدل خطأ UDP التقني برسالة عربية قابلة للتنفيذ", () => {
    expect(toArabicError(new Error("Cannot read property 'createSocket' of null"))).toContain("ميزة اكتشاف أجهزة MikroTik غير متاحة");
  });

  it("يستبدل مهلة الشبكة برسالة عربية", () => {
    expect(toArabicError(new Error("socket timed out"))).toContain("انتهت مهلة الاتصال");
  });
});
