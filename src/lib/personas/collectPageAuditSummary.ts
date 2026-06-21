import type { PageAuditSummary } from "@/lib/personas/types";

type AuditLocator = {
  count: () => Promise<number>;
};

export type PageAuditCollector = {
  url: () => string;
  locator: (selector: string) => AuditLocator;
  evaluate?: <T>(pageFunction: () => T | Promise<T>) => Promise<T>;
};

export async function collectPageAuditSummary(page: PageAuditCollector): Promise<PageAuditSummary> {
  const fallbackUrl = safeReadUrl(page);

  if (page.evaluate) {
    try {
      return await page.evaluate(() => {
        const interactiveSelector = [
          "a[href]",
          "button",
          "input:not([type='hidden'])",
          "select",
          "textarea",
          "[role='button']",
          "[role='link']",
          "[role='checkbox']",
          "[role='radio']",
          "[tabindex]"
        ].join(",");
        const fieldSelector = "input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']), select, textarea";
        const interactiveElements = getVisibleElements(interactiveSelector);
        const fields = getVisibleElements(fieldSelector);
        const fieldLabels = fields.map((field) => normalizeLabel(getFieldLabel(field))).filter(Boolean);
        const duplicateLabels = new Set(fieldLabels.filter((label, index) => fieldLabels.indexOf(label) !== index));
        const buttonTexts = getVisibleElements("button, [role='button'], input[type='submit'], input[type='button'], a[href]")
          .map((element) => normalizeLabel(getControlText(element)))
          .filter(Boolean);
        const ambiguousButtonCount = buttonTexts.filter((text) =>
          /^(ok|yes|no|next|continue|submit|save|done|go|click here|learn more|looks fine|confirm)$/.test(text)
        ).length;
        const bodyText = getText(document.body);
        const modalCount = getVisibleElements("[role='dialog'], [aria-modal='true']").length;
        const privacyPromptCount = getVisibleElements("aside, section, form, [role='dialog'], [aria-modal='true'], .modal, .banner")
          .map((element) => getText(element).toLowerCase())
          .filter((text) => /(privacy|cookie|tracking|consent|newsletter|permission)/.test(text)).length;
        const cookieBannerPresent = /cookie|consent/.test(bodyText.toLowerCase()) && /(accept|reject|decline|privacy|tracking)/.test(bodyText.toLowerCase());
        const permissionPromptCount = (bodyText.match(/\b(allow|enable|grant)\b.{0,40}\b(location|notification|camera|microphone|permission)s?\b/gi) || [])
          .length;
        const smallTapTargetCount = interactiveElements.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
        }).length;
        const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 4;
        const fixedWideElementCount = Array.from(document.querySelectorAll("body *")).filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > document.documentElement.clientWidth + 4 && style.position === "fixed";
        }).length;
        const passwordFieldCount = fields.filter((field) => field instanceof HTMLInputElement && field.type === "password").length;
        const errorMessageCount = getVisibleElements("[role='alert'], .error, .invalid, [aria-live='assertive'], [aria-invalid='true']").length;
        const destructiveActionCount = buttonTexts.filter((text) => /\b(delete|remove|cancel|reset|destroy|terminate)\b/.test(text)).length;
        const hasRecoveryPath = fields.length
          ? buttonTexts.some((text) => /\b(back|cancel|undo|edit|try again|help|clear)\b/.test(text)) || document.querySelector("[href*='help']")
            ? true
            : undefined
          : undefined;
        const validationSelector = "[aria-invalid], [aria-describedby], [role='alert'], [aria-live], .error, .invalid";
        const hasInlineValidation = fields.length ? Boolean(document.querySelector(validationSelector)) || undefined : undefined;
        const navigationEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        const loadTimeMs = navigationEntry ? Math.round(navigationEntry.loadEventEnd || navigationEntry.domContentLoadedEventEnd) : undefined;
        const longTasks = performance.getEntriesByType("longtask");
        const totalBlockingTimeMs = Math.round(longTasks.reduce((total, entry) => total + Math.max(0, entry.duration - 50), 0));
        const layoutShiftEntries = performance.getEntriesByType("layout-shift") as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>;
        const layoutShiftRiskScore = clamp01(
          layoutShiftEntries
            .filter((entry) => !entry.hadRecentInput)
            .reduce((total, entry) => total + (typeof entry.value === "number" ? entry.value : 0), 0)
        );
        const thirdPartyTrackerCount = Array.from(document.querySelectorAll("script[src]")).filter((script) => {
          const src = script.getAttribute("src");
          if (!src) return false;
          try {
            return new URL(src, location.href).hostname !== location.hostname;
          } catch {
            return false;
          }
        }).length;
        const thirdPartyLoginCount = buttonTexts.filter((text) => /\b(google|facebook|github|apple|microsoft|sso|single sign-on)\b/.test(text)).length;
        const jargonTermCount = countWordMatches(bodyText, [
          "2fa",
          "api",
          "authorization",
          "billing",
          "oauth",
          "permission",
          "saml",
          "sku",
          "sso",
          "token",
          "webhook"
        ]);
        const mobileRiskScore = clamp01(
          normalizedCount(smallTapTargetCount, 8) * 0.35 +
            (horizontalOverflow ? 0.28 : 0) +
            normalizedCount(fixedWideElementCount, 3) * 0.18 +
            normalizedCount(modalCount, 3) * 0.12 +
            (fields.length > 8 ? 0.07 : 0)
        );
        const performanceRiskScore = clamp01(normalizedCount(loadTimeMs, 5000) * 0.65 + normalizedCount(totalBlockingTimeMs, 700) * 0.35);

        return {
          url: location.href,
          title: document.title || undefined,
          interactiveElementCount: interactiveElements.length,
          formFieldCount: fields.length,
          requiredFieldCount: fields.filter((field) => field.hasAttribute("required") || field.getAttribute("aria-required") === "true").length,
          missingLabelCount: fields.filter((field) => !normalizeLabel(getFieldLabel(field))).length,
          duplicateLabelCount: duplicateLabels.size,
          ambiguousButtonCount,
          jargonTermCount,
          longCopyBlockCount: getVisibleElements("p, li, section, article").filter((element) => getText(element).length > 260).length,
          colorContrastIssueCount: countContrastIssues(),
          smallTextCount: getVisibleElements("p, span, label, a, button, li, input, textarea, select").filter((element) => {
            const fontSize = Number.parseFloat(window.getComputedStyle(element).fontSize || "16");
            return fontSize > 0 && fontSize < 12 && getText(element).trim().length > 0;
          }).length,
          smallTapTargetCount,
          focusOrderIssueCount: interactiveElements.filter((element) => Number(element.getAttribute("tabindex")) > 0).length,
          keyboardTrapCount: getVisibleElements("[data-focus-trap='true']").length,
          autocompleteIssueCount: fields.filter((field) => field instanceof HTMLInputElement && needsAutocomplete(field) && !field.autocomplete).length,
          mobileRiskScore,
          performanceRiskScore,
          layoutShiftRiskScore,
          loadTimeMs,
          totalBlockingTimeMs,
          cookieBannerPresent,
          privacyPromptCount,
          permissionPromptCount,
          thirdPartyTrackerCount,
          thirdPartyLoginCount,
          passwordFieldCount,
          hasInlineValidation,
          errorMessageCount,
          hasRecoveryPath,
          captchaPresent: /captcha|verify you are human|are you human/i.test(bodyText),
          destructiveActionCount,
          horizontalOverflow,
          modalCount
        };

        function getVisibleElements(selector: string) {
          return Array.from(document.querySelectorAll(selector)).filter(isVisible);
        }

        function isVisible(element: Element) {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        }

        function getText(element: Element | null) {
          if (!element) return "";
          return ((element as HTMLElement).innerText || element.textContent || "").trim();
        }

        function getControlText(element: Element) {
          if (element instanceof HTMLInputElement) return element.value || element.getAttribute("aria-label") || element.name || "";
          return getText(element) || element.getAttribute("aria-label") || element.getAttribute("title") || "";
        }

        function getFieldLabel(field: Element) {
          const ariaLabel = field.getAttribute("aria-label");
          if (ariaLabel) return ariaLabel;

          const labelledBy = field.getAttribute("aria-labelledby");
          if (labelledBy) {
            const labelText = labelledBy
              .split(/\s+/)
              .map((id) => getText(document.getElementById(id)))
              .filter(Boolean)
              .join(" ");
            if (labelText) return labelText;
          }

          const id = field.getAttribute("id");
          if (id) {
            const label = document.querySelector(`label[for='${cssEscape(id)}']`);
            if (label) return getText(label);
          }

          const wrappingLabel = field.closest("label");
          if (wrappingLabel) return getText(wrappingLabel);

          return field.getAttribute("placeholder") || field.getAttribute("title") || field.getAttribute("name") || "";
        }

        function cssEscape(value: string) {
          if ("CSS" in window && typeof window.CSS.escape === "function") return window.CSS.escape(value);
          return value.replace(/["'\\]/g, "\\$&");
        }

        function normalizeLabel(value: string | null | undefined) {
          return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
        }

        function needsAutocomplete(field: HTMLInputElement) {
          return /email|name|tel|phone|address|postal|zip|password|cc-|card/i.test([field.type, field.name, field.id].join(" "));
        }

        function countWordMatches(text: string, words: string[]) {
          const normalized = text.toLowerCase();
          return words.reduce((count, word) => count + (normalized.match(new RegExp(`\\b${word}\\b`, "g")) || []).length, 0);
        }

        function countContrastIssues() {
          return getVisibleElements("button, a, label, p, span, li, input, textarea, select, h1, h2, h3")
            .slice(0, 80)
            .filter((element) => {
              if (!getText(element)) return false;
              const style = window.getComputedStyle(element);
              const foreground = parseRgb(style.color);
              const background = parseRgb(getEffectiveBackground(element));
              if (!foreground || !background) return false;
              return getContrastRatio(foreground, background) < 4.5;
            }).length;
        }

        function getEffectiveBackground(element: Element) {
          let current: Element | null = element;
          while (current) {
            const backgroundColor = window.getComputedStyle(current).backgroundColor;
            const rgb = parseRgb(backgroundColor);
            if (rgb && rgb.alpha > 0.05) return backgroundColor;
            current = current.parentElement;
          }
          return "rgb(255, 255, 255)";
        }

        function parseRgb(value: string) {
          const match = value.match(/rgba?\(([^)]+)\)/);
          if (!match) return null;
          const [red, green, blue, alpha = "1"] = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
          if (![red, green, blue, Number.parseFloat(String(alpha))].every(Number.isFinite)) return null;
          return { red, green, blue, alpha: Number.parseFloat(String(alpha)) };
        }

        function getContrastRatio(
          foreground: { red: number; green: number; blue: number },
          background: { red: number; green: number; blue: number }
        ) {
          const lighter = Math.max(getLuminance(foreground), getLuminance(background));
          const darker = Math.min(getLuminance(foreground), getLuminance(background));
          return (lighter + 0.05) / (darker + 0.05);
        }

        function getLuminance(color: { red: number; green: number; blue: number }) {
          const [red, green, blue] = [color.red, color.green, color.blue].map((channel) => {
            const value = channel / 255;
            return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          });
          return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        }

        function normalizedCount(value: number | undefined, highWaterMark: number) {
          if (!Number.isFinite(value) || highWaterMark <= 0) return 0;
          return Math.max(0, Math.min(1, Number(value) / highWaterMark));
        }

        function clamp01(value: number) {
          if (!Number.isFinite(value)) return 0;
          return Math.max(0, Math.min(1, value));
        }
      });
    } catch {
      return collectFallbackAudit(page, fallbackUrl);
    }
  }

  return collectFallbackAudit(page, fallbackUrl);
}

async function collectFallbackAudit(page: PageAuditCollector, url: string): Promise<PageAuditSummary> {
  return {
    url,
    interactiveElementCount: await countSelector(page, "a[href], button, input, select, textarea, [role='button'], [tabindex]"),
    formFieldCount: await countSelector(page, "input:not([type='hidden']), select, textarea"),
    missingLabelCount: 0,
    mobileRiskScore: 0,
    performanceRiskScore: 0,
    privacyPromptCount: 0,
    cookieBannerPresent: false
  };
}

async function countSelector(page: PageAuditCollector, selector: string) {
  try {
    return await page.locator(selector).count();
  } catch {
    return 0;
  }
}

function safeReadUrl(page: PageAuditCollector) {
  try {
    return page.url();
  } catch {
    return "";
  }
}
