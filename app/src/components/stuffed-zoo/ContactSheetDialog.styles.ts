import { css } from "styled-system/css";

export const contactSheetDialogContentClass = css({
  w: "calc(100vw - 32px)",
  "@media print": {
    w: "auto",
    maxW: "none",
    maxH: "none",
    boxShadow: "none",
    borderWidth: "0",
    bg: "transparent",
    overflow: "visible",
  },
});

export const contactSheetPreviewClass = css({
  w: "full",
  bg: "bg.default",
  color: "fg.default",
  borderRadius: "lg",
  borderWidth: "1px",
  borderColor: "border",
  p: { base: "3", md: "4" },
  "@media print": {
    borderWidth: "0",
    borderRadius: "0",
    p: "0",
    bg: "white",
    color: "black",
  },
});

export const contactSheetHeaderClass = css({
  display: "flex",
  alignItems: "end",
  justifyContent: "space-between",
  gap: "3",
  mb: "3",
  borderBottomWidth: "1px",
  borderBottomColor: "border",
  pb: "2",
  "@media print": {
    mb: "0.08in",
    pb: "0.06in",
    borderBottomColor: "gray.300",
  },
});

export const contactSheetTitleClass = css({
  fontWeight: "extrabold",
  fontSize: { base: "lg", md: "xl" },
  lineHeight: "1.1",
  "@media print": {
    fontSize: "12pt",
  },
});

export const contactSheetMetaClass = css({
  color: "fg.muted",
  fontSize: "sm",
  fontWeight: "semibold",
  whiteSpace: "nowrap",
  "@media print": {
    color: "gray.700",
    fontSize: "8pt",
  },
});

export const contactSheetGridClass = css({
  display: "grid",
  gridTemplateColumns: {
    base: "repeat(2, minmax(0, 1fr))",
    md: "repeat(4, minmax(0, 1fr))",
  },
  gap: { base: "2", md: "3" },
  "@media print": {
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: "0.08in",
  },
});

export const contactSheetCardClass = css({
  position: "relative",
  minW: "0",
  minH: "150px",
  display: "grid",
  gridTemplateRows: "1fr auto",
  gap: "2",
  p: "2",
  borderRadius: "md",
  borderWidth: "1px",
  borderColor: "border",
  bg: "bg.subtle",
  breakInside: "avoid",
  pageBreakInside: "avoid",
  "@media print": {
    minH: "1.32in",
    gap: "0.03in",
    p: "0.06in",
    borderRadius: "0.08in",
    borderColor: "gray.500",
    bg: "white",
  },
});

export const contactSheetCheckClass = css({
  position: "absolute",
  top: "2",
  right: "2",
  w: "6",
  h: "6",
  borderRadius: "full",
  borderWidth: "2px",
  borderColor: "fg.default",
  bg: "white",
  boxShadow: "sm",
  "@media print": {
    top: "0.06in",
    right: "0.06in",
    w: "0.18in",
    h: "0.18in",
    borderWidth: "1.4pt",
    boxShadow: "none",
  },
});

export const contactSheetImageFrameClass = css({
  minW: "0",
  minH: "0",
  display: "grid",
  placeItems: "center",
  aspectRatio: "1 / 1",
  borderRadius: "sm",
  overflow: "hidden",
  bg: "white",
  "@media print": {
    borderRadius: "0.04in",
  },
  "& img": {
    w: "full",
    h: "full",
    objectFit: "contain",
  },
});

export const contactSheetNameClass = css({
  minW: "0",
  color: "fg.default",
  fontWeight: "bold",
  fontSize: "sm",
  lineHeight: "1.1",
  textAlign: "center",
  overflowWrap: "anywhere",
  "@media print": {
    color: "black",
    fontSize: "7.5pt",
    lineHeight: "1.05",
  },
});

export const contactSheetEmptyClass = css({
  minH: "220px",
  display: "grid",
  placeItems: "center",
  color: "fg.muted",
  fontWeight: "semibold",
  textAlign: "center",
});
