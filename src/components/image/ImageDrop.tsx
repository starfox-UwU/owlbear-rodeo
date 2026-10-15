import React from "react";
import { Box, Flex, Text } from "theme-ui";

import useImageDrop, { ImageDropEvent } from "../../hooks/useImageDrop";
import { useTranslation } from "../../i18n";

type ImageDropProps = {
  onDrop: (event: ImageDropEvent) => void;
  dropText: string;
  children?: React.ReactNode;
};

function ImageDrop({ onDrop, dropText, children }: ImageDropProps) {
  const t = useTranslation();
  const { dragging, containerListeners, overlayListeners } =
    useImageDrop(onDrop);
  return (
    <Box {...containerListeners}>
      {children}
      {dragging && (
        <Flex
          bg="overlay"
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            left: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            cursor: "copy",
          }}
          {...overlayListeners}
        >
          <Text sx={{ pointerEvents: "none", color: "primary" }}>
            {dropText || t("misc.imageDrop.dropDefault")}
          </Text>
        </Flex>
      )}
    </Box>
  );
}

export default ImageDrop;
