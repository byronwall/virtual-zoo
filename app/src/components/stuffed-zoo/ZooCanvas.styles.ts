import { css } from "styled-system/css";

export const canvasShellClass = css({
  position: "relative",
  w: "full",
  h: "full",
  minW: "0",
  minH: "0",
});

export const canvasClass = css({
  position: "relative",
  w: "full",
  h: "full",
  minW: "0",
  minH: "0",
  maxW: "100%",
  overflow: "hidden",
  borderRadius: "2xl",
  bg: "green.subtle.bg",
  borderWidth: "2px",
  borderColor: "green.subtle.border",
  touchAction: "none",
  cursor: "grab",
  _active: {
    cursor: "grabbing",
  },
});

export const canvasLayerClass = css({
  position: "absolute",
  inset: "0",
  display: "block",
  w: "full",
  h: "full",
});
