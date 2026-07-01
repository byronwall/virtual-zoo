import { css } from "styled-system/css";

export const appTitleClass = css({
  fontSize: { base: "2xl", md: "3xl" },
  fontWeight: "extrabold",
  color: "fg.default",
  lineHeight: "1.05",
});

export const appShellClass = css({
  w: "100dvw",
  h: "100dvh",
  maxW: "100dvw",
  maxH: "100dvh",
  overflow: "hidden",
  bg: "orange.subtle.bg",
  backgroundImage:
    "radial-gradient(circle at 12% 10%, rgba(255, 197, 61, .42) 0 9rem, transparent 9.5rem), radial-gradient(circle at 92% 18%, rgba(76, 195, 138, .28) 0 10rem, transparent 10.5rem), linear-gradient(180deg, rgba(255,255,255,.52), rgba(255,255,255,0))",
  color: "fg.default",
});

export const appFrameClass = css({
  w: "full",
  h: "full",
  minW: "0",
  minH: "0",
  overflow: "hidden",
});

export const appHeaderClass = css({
  flex: "0 0 auto",
  minW: "0",
  flexWrap: { base: "wrap", md: "nowrap" },
  "& > :first-child": {
    minW: "0",
  },
});

export const appLogoClass = css({
  flex: "0 0 auto",
  w: { base: "12", md: "14" },
  h: { base: "12", md: "14" },
  borderRadius: "xl",
  boxShadow: "sm",
});

export const appContentClass = css({
  flex: "1 1 auto",
  minW: "0",
  minH: "0",
  maxW: "100%",
  overflow: "visible",
  gridTemplateColumns: {
    base: "minmax(0, 1fr)",
    md: "minmax(0, 1fr) minmax(320px, 360px)",
  },
  gridTemplateRows: {
    base: "minmax(0, 1fr) minmax(0, 36%)",
    md: "minmax(0, 1fr)",
  },
  alignItems: "stretch",
});

export const passcodeShellClass = css({
  minH: "dvh",
  display: "grid",
  placeItems: "center",
  p: "4",
});

export const passcodeBoxClass = css({
  w: "full",
  maxW: "420px",
  p: "6",
  borderRadius: "2xl",
  bg: "bg.default",
  borderWidth: "2px",
  borderColor: "orange.subtle.border",
  boxShadow: "0 22px 60px rgba(216, 87, 42, .2)",
});

export const errorClass = css({
  color: "red.default",
  fontWeight: "semibold",
});

export const photoMediaRowClass = css({
  display: "grid",
  gridTemplateColumns: {
    base: "minmax(0, 1fr) 128px",
    md: "minmax(0, 1fr) 180px",
  },
  gap: "4",
  alignItems: "stretch",
  minW: "0",
});

export const photoPickerClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "3",
  minW: "0",
  minH: "120px",
  borderRadius: "xl",
  borderWidth: "2px",
  borderStyle: "dashed",
  borderColor: "orange.outline.border",
  bg: "amber.subtle.bg",
  color: "orange.default",
  fontWeight: "bold",
  cursor: "pointer",
  transition: "background-color 140ms ease, border-color 140ms ease, transform 140ms ease",
  _hover: {
    bg: "orange.subtle.bg",
    borderColor: "orange.default",
    transform: "translateY(-1px)",
  },
  "& input": {
    srOnly: true,
  },
  "& span": {
    minW: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

export const photoPreviewClass = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  w: "full",
  h: "120px",
  borderRadius: "lg",
  borderWidth: "1px",
  borderColor: "border",
  bg: "bg.subtle",
  boxShadow: "sm",
  overflow: "hidden",
  color: "fg.muted",
  fontSize: "sm",
  fontWeight: "semibold",
  "& img": {
    w: "full",
    h: "full",
    objectFit: "cover",
  },
});

export const labelClass = css({
  display: "block",
  mb: "1.5",
  fontWeight: "bold",
});

export const typeQuickPickRowClass = css({
  display: "flex",
  gap: "2",
  mt: "2",
  maxW: "100%",
  overflowX: "auto",
  overflowY: "hidden",
  pb: "1",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
});

export const deletePromptClass = css({
  position: "fixed",
  left: "50%",
  bottom: "5",
  transform: "translateX(-50%)",
  px: "4",
  py: "2",
  borderRadius: "full",
  bg: "red.default",
  color: "white",
  fontWeight: "bold",
  boxShadow: "lg",
});
