/** 角色卡图标：纸张轮廓 + 人物剪影。 */
function CharacterSheetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      color="currentcolor"
    >
      <g
        fill="none"
        stroke="currentcolor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M6.2 2.6h7.2l4.4 4.4v14.4H6.2z" />
        <path d="M13.2 2.8V7.2h4.4" />
      </g>
      <g fill="currentcolor">
        <circle cx="11.8" cy="12.4" r="1.9" />
        <path d="M8.4 19.2c0-1.7 1.5-2.9 3.4-2.9s3.4 1.2 3.4 2.9z" />
      </g>
    </svg>
  );
}

export default CharacterSheetIcon;
