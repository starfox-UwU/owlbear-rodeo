import { Button } from "theme-ui";

import { useI18n } from "../i18n";
import { LANGUAGE_LABELS } from "../i18n/core";
import type { Language } from "../i18n/core";

/**
 * 首页 / 文档页的快捷语言切换。
 *
 * 在设置弹窗里也有完整的「语言」下拉（含「跟随系统」选项），
 * 这里只做中英两态切换，让新用户第一次打开页面就能切到母语。
 */
function LanguageToggle() {
  const { language, setPreference } = useI18n();

  function toggle() {
    const next: Language = language === "zh" ? "en" : "zh";
    setPreference(next);
  }

  return (
    <Button
      variant="secondary"
      m={2}
      onClick={toggle}
      title={LANGUAGE_LABELS[language]}
      aria-label={LANGUAGE_LABELS[language]}
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {LANGUAGE_LABELS[language]}
    </Button>
  );
}

export default LanguageToggle;
