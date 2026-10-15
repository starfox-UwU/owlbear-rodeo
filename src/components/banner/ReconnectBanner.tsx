import { Flex } from "theme-ui";

import Banner from "./Banner";
import ReconnectingIcon from "../../icons/ReconnectingIcon";

import { useI18n } from "../../i18n";

function ReconnectBanner({ isOpen }: { isOpen: boolean }) {
  const { t } = useI18n();

  return (
    <Banner
      isOpen={isOpen}
      onRequestClose={() => {}}
      allowClose={false}
      backgroundColor="transparent"
    >
      <Flex
        sx={{
          width: "28px",
          height: "28px",
          borderRadius: "28px",
          alignItems: "center",
          justifyContent: "center",
        }}
        bg="overlay"
        title={t("common.reconnectTooltip")}
        aria-label={t("common.reconnectTooltip")}
      >
        <ReconnectingIcon />
      </Flex>
    </Banner>
  );
}

export default ReconnectBanner;
