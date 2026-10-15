import { Button } from "theme-ui";

import { useI18n } from "../i18n";
import { LANGUAGE_LABELS } from "../i18n/core";
import type { Language } from "../i18n/core";

type LanguageToggleProps = {
  /** 传 "footer" 时使用页脚链接样式（页脚只有 48px 高，放得下） */
  variant?: string;
};

/**
 * 中英两态快捷切换。
 *
 * 完整的「跟随系统 / 简体中文 / English」下拉在设置弹窗里，
 * 这里是为了让第一次打开页面的用户能立刻切到自己的母语——
 * 按钮上显示的是目标语言的母语名，所以两种语言下都认得出来。
 */
function LanguageToggle({ variant }: LanguageToggleProps) {
  const { language, setPreference } = useI18n();

  const next: Language = language === "zh" ? "en" : "zh";
  const label = LANGUAGE_LABELS[next];

  return (
    <Button
      variant={variant}
      m={2}
      p={variant ? 0 : undefined}
      bg={variant ? "transparent" : undefined}
      onClick={() => setPreference(next)}
      title={label}
      aria-label={label}
      sx={{ cursor: "pointer" }}
    >
      {label}
    </Button>
  );
}

export default LanguageToggle;
