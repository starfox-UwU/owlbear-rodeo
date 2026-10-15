import { Box, Text } from "theme-ui";

import Banner from "./Banner";

import { RequestCloseEventHandler } from "../../types/Events";

import { useI18n } from "../../i18n";

type ErrorBannerProps = {
  error: Error | undefined;
  onRequestClose: RequestCloseEventHandler;
};

function ErrorBanner({ error, onRequestClose }: ErrorBannerProps) {
  const { t } = useI18n();

  return (
    <Banner isOpen={!!error} onRequestClose={onRequestClose}>
      <Box p={1}>
        <Text as="p" variant="body2">
          {t("common.errorMessage", { message: error?.message ?? "" })}
        </Text>
      </Box>
    </Banner>
  );
}

export default ErrorBanner;
