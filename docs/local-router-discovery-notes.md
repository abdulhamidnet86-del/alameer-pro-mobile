# ملاحظات اتصال MikroTik المحلي

التطبيق الحالي يرسل أوامر RouterOS عبر خادم التطبيق، لذلك لا يستطيع APK الوصول مباشرةً إلى منفذ API المحلي 8728/8729 دون طبقة sockets أصلية.

| الحاجة | النتيجة التقنية |
|---|---|
| اتصال RouterOS محلي عبر TCP وTLS | مكتبة `react-native-tcp-socket` توفر واجهة TCP/TLS أصلية متوافقة مع Android وReact Native الحديث، وتتطلب بناء APK جديدًا ولا تعمل داخل Expo Go. |
| اكتشاف أجهزة MikroTik | بث Neighbor Discovery الخاص بـ MikroTik يعمل عبر UDP؛ مكتبة `react-native-udp` توفر UDP أصليًا ولكنها قديمة نسبيًا، ويستلزم اعتمادها تحققًا ميدانيًا على Android. |
| Expo Network | يعرض حالة الشبكة وIP/MAC للهاتف؛ لا يكتشف بوابة MikroTik أو MAC الراوتر بنفسه. |

المصدران التوثيقيان المقروءان: https://www.npmjs.com/package/react-native-tcp-socket وhttps://www.npmjs.com/package/react-native-udp.

## شرط الاكتشاف في RouterOS

يعتمد اكتشاف الجيران على تفعيل Neighbor Discovery على واجهة الشبكة التي يتصل بها الهاتف، ويجري استقبال بث MNDP محليًا عبر UDP 5678. عند عدم ظهور أجهزة، يجب أن توجه الواجهة المستخدم للتحقق من اتصال الهاتف بالشبكة نفسها ومن قائمة واجهات الاكتشاف في RouterOS بدل عرض أجهزة افتراضية.

المصدر: https://help.mikrotik.com/docs/spaces/ROS/pages/24805517/Neighbor+discovery.
