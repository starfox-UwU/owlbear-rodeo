import React, { useState } from "react";
import { Flex, Text, Button, IconButton } from "theme-ui";

import ClearDiceIcon from "../../icons/ClearDiceIcon";
import RerollDiceIcon from "../../icons/RerollDiceIcon";

import { getDiceRollTotal } from "../../helpers/dice";
import { DiceRoll } from "../../types/Dice";

import { useI18n } from "../../i18n";

const maxDiceRollsShown = 6;

type DiceResultsProps = {
  diceRolls: DiceRoll[];
  onDiceClear: () => void;
  onDiceReroll: () => void;
};

function DiceResults({
  diceRolls,
  onDiceClear,
  onDiceReroll,
}: DiceResultsProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  if (diceRolls.length === 0) {
    return null;
  }

  let rolls: React.ReactChild[] = [];
  if (diceRolls.length > 1) {
    rolls = diceRolls
      .filter((dice) => dice.roll !== "unknown")
      .map((dice, index) => (
        <React.Fragment key={index}>
          <Text variant="body2" as="p" color="hsl(210, 50%, 96%)">
            {dice.roll}
          </Text>
          <Text variant="body2" as="p" color="grey">
            {index === diceRolls.length - 1 ? "" : "+"}
          </Text>
        </React.Fragment>
      ));
  }

  return (
    <Flex
      sx={{
        justifyContent: "space-between",
        alignItems: "center",
        position: "absolute",
        bottom: "5%",
        left: 0,
        right: 0,
        display: "flex",
        color: "white",
        pointerEvents: "none",
      }}
    >
      <IconButton
        ml="7%"
        title={t("dice.clearDice")}
        aria-label={t("dice.clearDice")}
        onClick={onDiceClear}
        sx={{ pointerEvents: "all" }}
      >
        <ClearDiceIcon />
      </IconButton>
      <Flex
        sx={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          variant="heading"
          as="h1"
          sx={{ fontSize: 5, userSelect: "none" }}
        >
          {getDiceRollTotal(diceRolls)}
        </Text>
        {rolls.length > maxDiceRollsShown ? (
          <Button
            aria-label={t("dice.showDetails")}
            title={t("dice.showDetails")}
            onClick={() => setIsExpanded(!isExpanded)}
            variant="secondary"
            sx={{ display: "flex", height: "24px", pointerEvents: "all" }}
          >
            {isExpanded ? rolls : rolls.slice(0, maxDiceRollsShown)}
            {!isExpanded && (
              <Text variant="body2" as="p" color="hsl(210, 50%, 96%)">
                ...
              </Text>
            )}
          </Button>
        ) : (
          <Flex sx={{ height: "15px" }}>{rolls}</Flex>
        )}
      </Flex>
      <IconButton
        mr="7%"
        title={t("dice.rerollDice")}
        aria-label={t("dice.rerollDice")}
        onClick={onDiceReroll}
        sx={{ pointerEvents: "all" }}
      >
        <RerollDiceIcon />
      </IconButton>
    </Flex>
  );
}

export default DiceResults;
