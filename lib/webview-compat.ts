import { registerPlugin } from "@capacitor/core";

export interface WebViewCompatPlugin {
  check(options?: { locale?: string }): Promise<void>;
}

const WebViewCompat = registerPlugin<WebViewCompatPlugin>("WebViewCompat", {
  web: async () => {
    return {
      async check() {
        // No-op on web
      },
    };
  },
});

export async function checkWebViewCompat(locale?: string): Promise<void> {
  try {
    await WebViewCompat.check({ locale });
  } catch {
    // Plugin check is best-effort; fail silently
  }
}
