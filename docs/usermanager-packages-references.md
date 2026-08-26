# User Manager Packages Reference

اعتمد تنفيذ شاشة إدارة الباقات على مسارات RouterOS API التالية في RouterOS v6.49.19:

| الكيان | المسار | الحقول المستخدمة |
|---|---|---|
| Profile | `/user-manager/profile` | `name`, `name-for-users`, `price`, `validity`, `starts-when`, `comment` |
| Limitation | `/user-manager/limitation` | `name`, `download-limit`, `upload-limit`, `transfer-limit`, `uptime-limit`, `comment` |
| Profile Limitation | `/user-manager/profile-limitation` | `profile`, `limitation`, `from-time`, `till-time`, `weekdays` |
| User Profile | `/user-manager/user-profile` | يُستخدم لعدّ المستخدمين المرتبطين بالباقة عند الحاجة |

المراجع الرسمية: توثيق [MikroTik User Manager](https://help.mikrotik.com/docs/spaces/ROS/pages/2555940/User+Manager) يعرّف Profile وLimitation وProfile-Limitation وحقولها، وتوثيق [MikroTik API](https://help.mikrotik.com/docs/spaces/ROS/pages/47579160/API) يوضح أن أوامر API تتبع صياغة CLI وأن `print` يدعم `.proplist` لتحسين الأداء.

ملاحظة تشغيلية: لا توجد بيانات افتراضية في الشاشة. عند عدم وجود اتصال أو فشل الصلاحيات تُعرض حالة عربية واضحة، ولا يتم اعتبار الباقة محفوظة محليًا إلا بعد نجاح عملية RouterOS الفعلية.
