import { Flex } from "theme-ui";

import Link from "./Link";
import LanguageToggle from "./LanguageToggle";

import { useI18n } from "../i18n";

function Footer() {
  const { t } = useI18n();

  return (
    <Flex
      bg="muted"
      sx={{
        height: "48px",
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <Link m={2} to="/about" variant="footer">
        {t("footer.about")}
      </Link>
      <Link m={2} to="/" variant="footer">
        {t("footer.home")}
      </Link>
      <Link m={2} to="/faq" variant="footer">
        {t("footer.faq")}
      </Link>
      <Link m={2} to="/release-notes" variant="footer">
        {t("footer.releaseNotes")}
      </Link>
      <Link m={2} to="/how-to" variant="footer">
        {t("footer.howTo")}
      </Link>
      <LanguageToggle variant="footer" />
    </Flex>
  );
}

export default Footer;
