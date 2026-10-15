import { Flex, Text } from "theme-ui";
import { useLocation } from "react-router-dom";

import Footer from "../components/Footer";
import Markdown from "../components/Markdown";
import Accordion from "../components/Accordion";

import assets from "../docs/assets";

import { useI18n } from "../i18n";

import overview from "../docs/howTo/overview.md?raw";
import startingAndJoining from "../docs/howTo/startingAndJoining.md?raw";
import sharingMaps from "../docs/howTo/sharingMaps.md?raw";
import usingTokens from "../docs/howTo/usingTokens.md?raw";
import usingDrawing from "../docs/howTo/usingDrawing.md?raw";
import usingDice from "../docs/howTo/usingDice.md?raw";
import usingFog from "../docs/howTo/usingFog.md?raw";
import usingMeasure from "../docs/howTo/usingMeasure.md?raw";
import sharingAudio from "../docs/howTo/sharingAudio.md?raw";
import usingPointer from "../docs/howTo/usingPointer.md?raw";
import usingTimer from "../docs/howTo/usingTimer.md?raw";
import usingNotes from "../docs/howTo/usingNotes.md?raw";
import shortcuts from "../docs/howTo/shortcuts.md?raw";
import settings from "../docs/howTo/settings.md?raw";

function HowTo() {
  const location = useLocation();
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
          maxWidth: "564px",
          flexGrow: 1,
          width: "100%",
        }}
        p={4}
      >
        <Text mb={2} variant="heading" as="h1" sx={{ fontSize: 5 }}>
          {t("footer.howTo")}
        </Text>
        <div id="overview">
          <Markdown source={overview} assets={assets} />
        </div>
        <div id="startingAndJoining">
          <Accordion
            heading={t("transfer.howTo.startingAndJoining")}
            defaultOpen={location.hash === "#startingAndJoining"}
          >
            <Markdown source={startingAndJoining} assets={assets} />
          </Accordion>
        </div>
        <div id="sharingMaps">
          <Accordion
            heading={t("transfer.howTo.sharingMaps")}
            defaultOpen={location.hash === "#sharingMaps"}
          >
            <Markdown source={sharingMaps} assets={assets} />
          </Accordion>
        </div>
        <div id="usingTokens">
          <Accordion
            heading={t("transfer.howTo.usingTokens")}
            defaultOpen={location.hash === "#usingTokens"}
          >
            <Markdown source={usingTokens} assets={assets} />
          </Accordion>
        </div>
        <div id="usingDrawing">
          <Accordion
            heading={t("transfer.howTo.usingDrawing")}
            defaultOpen={location.hash === "#usingDrawing"}
          >
            <Markdown source={usingDrawing} assets={assets} />
          </Accordion>
        </div>
        <div id="usingDice">
          <Accordion
            heading={t("transfer.howTo.usingDice")}
            defaultOpen={location.hash === "#usingDice"}
          >
            <Markdown source={usingDice} assets={assets} />
          </Accordion>
        </div>
        <div id="usingFog">
          <Accordion
            heading={t("transfer.howTo.usingFog")}
            defaultOpen={location.hash === "#usingFog"}
          >
            <Markdown source={usingFog} assets={assets} />
          </Accordion>
        </div>
        <div id="usingMeasure">
          <Accordion
            heading={t("transfer.howTo.usingMeasure")}
            defaultOpen={location.hash === "#usingMeasure"}
          >
            <Markdown source={usingMeasure} assets={assets} />
          </Accordion>
        </div>
        <div id="usingPointer">
          <Accordion
            heading={t("transfer.howTo.usingPointer")}
            defaultOpen={location.hash === "#usingPointer"}
          >
            <Markdown source={usingPointer} assets={assets} />
          </Accordion>
        </div>
        <div id="usingNotes">
          <Accordion
            heading={t("transfer.howTo.usingNotes")}
            defaultOpen={location.hash === "#usingNotes"}
          >
            <Markdown source={usingNotes} assets={assets} />
          </Accordion>
        </div>
        <div id="usingTimer">
          <Accordion
            heading={t("transfer.howTo.usingTimer")}
            defaultOpen={location.hash === "#usingTimer"}
          >
            <Markdown source={usingTimer} assets={assets} />
          </Accordion>
        </div>
        <div id="settings">
          <Accordion
            heading={t("settings.title")}
            defaultOpen={location.hash === "#settings"}
          >
            <Markdown source={settings} assets={assets} />
          </Accordion>
        </div>
        <div id="sharingAudio">
          <Accordion
            heading={t("transfer.howTo.sharingAudio")}
            defaultOpen={location.hash === "#sharingAudio"}
          >
            <Markdown source={sharingAudio} assets={assets} />
          </Accordion>
        </div>
        <div id="shortcuts">
          <Accordion
            heading={t("transfer.howTo.shortcuts")}
            defaultOpen={location.hash === "#shortcuts"}
          >
            <Markdown source={shortcuts} assets={assets} />
          </Accordion>
        </div>
      </Flex>
      <Footer />
    </Flex>
  );
}

export default HowTo;
