import { useState, useEffect } from "react";
import { Flex, Button, Image, Text, IconButton, Link } from "theme-ui";

import Footer from "../components/Footer";
import LanguageToggle from "../components/LanguageToggle";

import StartModal from "../modals/StartModal";
import JoinModal from "../modals/JoinModal";
import GettingStartedModal from "../modals/GettingStartedModal";

import HelpIcon from "../icons/HelpIcon";

import { useAuth } from "../contexts/AuthContext";

import RedditIcon from "../icons/SocialRedditIcon";
import TwitterIcon from "../icons/SocialTwitterIcon";
import YouTubeIcon from "../icons/SocialYouTubeIcon";
import SocialPatreonIcon from "../icons/SocialPatreonIcon";

import owlington from "../images/Owlington.png";

import { useI18n } from "../i18n";

function Home() {
  const { t } = useI18n();
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isGettingStartedModalOpen, setIsGettingStartedModalOpen] =
    useState(false);

  // Reset password on visiting home
  const { setPassword } = useAuth();
  useEffect(() => {
    setPassword("");
  }, [setPassword]);

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
          justifyContent: "center",
          maxWidth: "300px",
          flexGrow: 1,
        }}
        mb={2}
      >
        <Text variant="display" as="h1" sx={{ textAlign: "center" }}>
          {t("home.title")}
        </Text>
        <Image src={owlington} m={2} />
        <Button
          variant="secondary"
          m={2}
          onClick={() => setIsGettingStartedModalOpen(true)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {t("home.gettingStarted")} <HelpIcon />
        </Button>
        <Button m={2} onClick={() => setIsStartModalOpen(true)}>
          {t("home.startGame")}
        </Button>
        <Button m={2} onClick={() => setIsJoinModalOpen(true)}>
          {t("home.joinGame")}
        </Button>
        <Text variant="caption" as="p" sx={{ textAlign: "center" }}>
          {t("home.legacyVersion", { version: __APP_VERSION__ })}
        </Text>
        <Flex sx={{ justifyContent: "center" }}>
          <LanguageToggle />
        </Flex>
        <Button
          as="a"
          // @ts-ignore
          href="https://owlbear.rodeo/"
          mt={4}
          mx={2}
          mb={2}
          sx={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          Owlbear Rodeo 2.0
        </Button>
        <Flex mb={4} mt={0} sx={{ justifyContent: "center" }}>
          <Link href="https://www.reddit.com/r/OwlbearRodeo/">
            <IconButton title="Reddit" aria-label="Reddit">
              <RedditIcon />
            </IconButton>
          </Link>
          <Link href="https://twitter.com/OwlbearRodeo">
            <IconButton title="Twitter" aria-label="Twitter">
              <TwitterIcon />
            </IconButton>
          </Link>
          <Link href="https://www.youtube.com/channel/UCePe1wJC53_7fbBbSECG7YQ">
            <IconButton title="YouTube" aria-label="YouTube">
              <YouTubeIcon />
            </IconButton>
          </Link>
          <Link href="https://patreon.com/owlbearrodeo">
            <IconButton title="Patreon" aria-label="Patreon">
              <SocialPatreonIcon />
            </IconButton>
          </Link>
        </Flex>
        <JoinModal
          isOpen={isJoinModalOpen}
          onRequestClose={() => setIsJoinModalOpen(false)}
        />
        <StartModal
          isOpen={isStartModalOpen}
          onRequestClose={() => setIsStartModalOpen(false)}
        />
        <GettingStartedModal
          isOpen={isGettingStartedModalOpen}
          onRequestClose={() => setIsGettingStartedModalOpen(false)}
        />
      </Flex>
      <Footer />
    </Flex>
  );
}

export default Home;
