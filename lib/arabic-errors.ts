/** يمنع عرض مصطلحات Runtime الإنجليزية في واجهات التطبيق الموجهة للمستخدم. */
export function toArabicError(value: unknown, fallback = "تعذر إتمام العملية الآن. تحقق من البيانات واتصال الشبكة ثم أعد المحاولة.") {
  const message = value instanceof Error ? value.message : String(value ?? "");
  const text = message.toLowerCase();
  if (text.includes("createsocket") || text.includes("native module") || text.includes("of null")) return "ميزة اكتشاف أجهزة MikroTik غير متاحة في هذه النسخة. أنشئ APK جديدًا ثم أعد المحاولة.";
  if (text.includes("permission") || text.includes("access_wifi_state")) return "لم يُسمح للتطبيق بقراءة حالة الشبكة. امنح صلاحية الشبكة ثم أعد المحاولة.";
  if (text.includes("timeout") || text.includes("timed out")) return "انتهت مهلة الاتصال. تحقق من الشبكة والعنوان والمنفذ ثم أعد المحاولة.";
  if (text.includes("network") || text.includes("socket")) return "تعذر تنفيذ عملية الشبكة. تأكد من اتصال الهاتف بشبكة الراوتر ثم أعد المحاولة.";
  return fallback;
}
