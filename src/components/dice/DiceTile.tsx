import { Image } from "theme-ui";

import Tile from "../tile/Tile";

import { DefaultDice } from "../../types/Dice";
import { diceNameKeys } from "../../dice";
import { useI18n } from "../../i18n";

type DiceTileProps = {
  dice: DefaultDice;
  isSelected: boolean;
  onDiceSelect: (dice: DefaultDice) => void;
  onDone: (dice: DefaultDice) => void;
};

function DiceTile({ dice, isSelected, onDiceSelect, onDone }: DiceTileProps) {
  const { t } = useI18n();
  const nameKey = diceNameKeys[dice.key];

  return (
    <div style={{ cursor: "pointer" }}>
      <Tile
        title={nameKey ? t(nameKey) : dice.name}
        isSelected={isSelected}
        onSelect={() => onDiceSelect(dice)}
        onDoubleClick={() => onDone(dice)}
      >
        <Image src={dice.preview}></Image>
      </Tile>
    </div>
  );
}

export default DiceTile;
