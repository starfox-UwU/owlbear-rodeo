import { Flex } from "theme-ui";

import Banner from "./Banner";
import OfflineIcon from "../../icons/OfflineIcon";

import { useI18n } from "../../i18n";

function OfflineBanner({ isOpen }: { isOpen: boolean }) {
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
        title={t("common.offlineTooltip")}
        aria-label={t("common.offlineTooltip")}
      >
        <OfflineIcon />
      </Flex>
    </Banner>
  );
}

export default OfflineBanner;
