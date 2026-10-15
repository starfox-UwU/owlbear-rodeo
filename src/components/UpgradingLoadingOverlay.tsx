import { useState, useEffect } from "react";
import { Text } from "theme-ui";

import LoadingOverlay from "./LoadingOverlay";

import { shuffle } from "../helpers/shared";

import { useI18n } from "../i18n";

function UpgradingLoadingOverlay() {
  const { t } = useI18n();
  const [subText, setSubText] = useState<string>();

  useEffect(() => {
    const facts = [
      t("common.upgrading.fact1"),
      t("common.upgrading.fact2"),
      t("common.upgrading.fact3"),
      t("common.upgrading.fact4"),
      t("common.upgrading.fact5"),
      t("common.upgrading.fact6"),
      t("common.upgrading.fact7"),
      t("common.upgrading.fact8"),
      t("common.upgrading.fact9"),
      t("common.upgrading.fact10"),
      t("common.upgrading.fact11"),
      t("common.upgrading.fact12"),
    ];
    let index = 0;
    let randomFacts = shuffle(facts);

    function updateFact() {
      setSubText(randomFacts[index % (randomFacts.length - 1)]);
      index += 1;
    }

    // Show first fact after 10 seconds then every 20 seconds after that
    let interval: NodeJS.Timeout;
    let timeout = setTimeout(() => {
      updateFact();
      interval = setInterval(() => {
        updateFact();
      }, 20 * 1000);
    }, 10 * 1000);

    return () => {
      clearTimeout(timeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [t]);

  return (
    <LoadingOverlay>
      <Text as="p" variant="body2" m={1}>
        {t("common.upgrading.title")}
      </Text>
      {subText && (
        <>
          <Text
            sx={{ maxWidth: "200px", textAlign: "center" }}
            as="p"
            variant="caption"
            m={1}
          >
            {t("common.upgrading.teaser")}
          </Text>
          <Text
            sx={{ maxWidth: "200px", textAlign: "center" }}
            as="p"
            variant="body2"
          >
            {subText}
          </Text>
        </>
      )}
    </LoadingOverlay>
  );
}

export default UpgradingLoadingOverlay;
