const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * واجهات التطبيق تضبط ترتيب RTL يدويًا؛ لذا يمنع Android من قلبها آليًا
 * وفق لغة الهاتف، ما يزيل الانعكاس المزدوج في APK النهائي.
 */
module.exports = function withFixedRtl(config) {
  return withAndroidManifest(config, (nextConfig) => {
    const application = nextConfig.modResults.manifest.application?.[0];
    if (application) {
      application.$ = { ...(application.$ || {}), "android:supportsRtl": "false" };
    }
    return nextConfig;
  });
};
