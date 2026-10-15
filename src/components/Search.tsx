import { Box, Input, InputProps } from "theme-ui";

import SearchIcon from "../icons/SearchIcon";

import { useI18n } from "../i18n";

function Search(props: InputProps) {
  const { t } = useI18n();

  return (
    <Box sx={{ position: "relative", flexGrow: 1 }}>
      <Input
        sx={{
          borderRadius: "0",
          border: "none",
          borderRight: "1px solid",
          ":focus": {
            outline: "none",
          },
          paddingRight: "36px",
        }}
        placeholder={t("common.search")}
        {...props}
      />
      <Box
        sx={{
          position: "absolute",
          right: "8px",
          top: "50%",
          transform: "translateY(-50%)",
          height: "24px",
          width: "24px",
          pointerEvents: "none",
        }}
      >
        <SearchIcon />
      </Box>
    </Box>
  );
}

export default Search;
