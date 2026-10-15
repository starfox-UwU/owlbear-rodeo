import { Fragment, ReactNode } from "react";
import { Box, Text } from "theme-ui";

import Link from "./Link";

import { useI18n } from "../i18n";

/**
 * 把带 `{{name}}` 占位符的整句拆成 React 节点。
 *
 * i18n 的 `t()` 插值只接受字符串，而这里的 `{{faq}}` 要替换成链接元素，
 * 所以单独做一次拆分：模板里没出现的键会被原样保留，不会丢内容。
 */
function interpolateNodes(
  template: string,
  values: Record<string, ReactNode>
): ReactNode[] {
  const pattern = /\{\{\s*(\w+)\s*\}\}/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(template)) !== null) {
    const value = values[match[1]];
    if (value === undefined) {
      continue;
    }
    if (match.index > lastIndex) {
      nodes.push(template.slice(lastIndex, match.index));
    }
    nodes.push(
      <Fragment key={`${match[1]}-${match.index}`}>{value}</Fragment>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) {
    nodes.push(template.slice(lastIndex));
  }
  return nodes;
}

function DatabaseDisabledMessage({ type }: { type: string }) {
  const { t } = useI18n();

  const typeLabel =
    type === "Map"
      ? t("databaseDisabled.map")
      : type === "Token"
      ? t("databaseDisabled.token")
      : type;

  return (
    <Box
      sx={{
        textAlign: "center",
        borderRadius: "2px",
        gridArea: "1 / 1 / span 1 / span 4",
      }}
      bg="highlight"
      p={1}
    >
      <Text as="p" variant="body2">
        {interpolateNodes(t("databaseDisabled.message"), {
          type: typeLabel,
          faq: (
            <Link to="/faq#database">{t("databaseDisabled.faqLink")}</Link>
          ),
        })}
      </Text>
    </Box>
  );
}

export default DatabaseDisabledMessage;
