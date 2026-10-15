/**
 * 权限图标：盾牌 + 小人，表示「谁能操作这个物件」。
 */
function PermissionIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      fill="currentcolor"
    >
      <path d="M0 0h24v24H0V0z" fill="none" />
      <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4.5c1.24 0 2.25 1.01 2.25 2.25S13.24 10 12 10s-2.25-1.01-2.25-2.25S10.76 5.5 12 5.5zm-4 9.09c0-1.5 3-2.34 4-2.34s4 .84 4 2.34V16H8v-1.41z" />
    </svg>
  );
}

export default PermissionIcon;
