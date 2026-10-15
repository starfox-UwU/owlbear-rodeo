import { Fragment, ReactNode } from "react";
import { Flex, Text, Link as ExternalLink } from "theme-ui";

import Footer from "../components/Footer";

import { useI18n } from "../i18n";

/**
 * 把带 `{{name}}` 占位符的整句拆成 React 节点。
 *
 * i18n 的 `t()` 插值只接受字符串，而这里的占位符要替换成链接元素，
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

function About() {
  const { t } = useI18n();

  return (
    <Flex
      sx={{
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "100%",
        alignItems: "center",
      }}
    >
      <Flex
        sx={{
          flexDirection: "column",
          maxWidth: "350px",
          flexGrow: 1,
        }}
        m={4}
      >
        <Text my={2} variant="heading" as="h1" sx={{ fontSize: 5 }}>
          {t("about.title")} <span aria-hidden="true">ʕ•ᴥ•ʔ</span>
        </Text>
        <Text my={1} mt={2} variant="heading" as="h3" sx={{ fontSize: 3 }}>
          {t("about.goalHeading")}
        </Text>
        <Text variant="body2" as="p">
          {t("about.goalBody")}
        </Text>
        <Text my={1} mt={2} variant="heading" as="h3" sx={{ fontSize: 3 }}>
          {t("about.peopleHeading")}
        </Text>
        <Text variant="body2" as="p">
          {interpolateNodes(t("about.peopleBody"), {
            mitch: (
              <ExternalLink href="https://mitchmccaffrey.com/">Mitch</ExternalLink>
            ),
            nicola: (
              <ExternalLink href="https://twitter.com/nthouliss">
                Nicola
              </ExternalLink>
            ),
          })}
        </Text>
        <Text my={1} mt={2} variant="heading" as="h3" sx={{ fontSize: 3 }}>
          {t("about.contactHeading")}
        </Text>
        <Text variant="body2" as="p">
          {interpolateNodes(t("about.contactBody"), {
            email: (
              <ExternalLink href="mailto:support@owlbear.rodeo">
                support@owlbear.rodeo
              </ExternalLink>
            ),
          })}
        </Text>
      </Flex>
      <Footer />
    </Flex>
  );
}

export default About;
