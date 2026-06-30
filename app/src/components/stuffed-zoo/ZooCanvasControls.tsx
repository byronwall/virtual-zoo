import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ZoomIn, ZoomOut } from "lucide-solid";
import { css } from "styled-system/css";
import { Box } from "styled-system/jsx";
import { IconButton } from "~/components/ui";

type ZooCanvasControlsProps = {
  onZoomOut: () => void;
  onZoomIn: () => void;
  onPanLeft: () => void;
  onPanRight: () => void;
  onPanUp: () => void;
  onPanDown: () => void;
};

export function ZooCanvasControls(props: ZooCanvasControlsProps) {
  return (
    <Box class={canvasControlsClass} aria-label="Canvas controls">
      <IconButton
        aria-label="Zoom out"
        size="sm"
        variant="outline"
        onClick={props.onZoomOut}
      >
        <ZoomOut size={16} />
      </IconButton>
      <IconButton
        aria-label="Zoom in"
        size="sm"
        variant="outline"
        onClick={props.onZoomIn}
      >
        <ZoomIn size={16} />
      </IconButton>
      <IconButton
        aria-label="Pan left"
        size="sm"
        variant="outline"
        onClick={props.onPanLeft}
      >
        <ArrowLeft size={16} />
      </IconButton>
      <IconButton
        aria-label="Pan right"
        size="sm"
        variant="outline"
        onClick={props.onPanRight}
      >
        <ArrowRight size={16} />
      </IconButton>
      <IconButton
        aria-label="Pan up"
        size="sm"
        variant="outline"
        onClick={props.onPanUp}
      >
        <ArrowUp size={16} />
      </IconButton>
      <IconButton
        aria-label="Pan down"
        size="sm"
        variant="outline"
        onClick={props.onPanDown}
      >
        <ArrowDown size={16} />
      </IconButton>
    </Box>
  );
}

const canvasControlsClass = css({
  position: "absolute",
  bottom: "calc(100% + token(spacing.3))",
  right: "3",
  zIndex: "docked",
  display: "flex",
  alignItems: "center",
  gap: "2",
  maxW: "calc(100% - token(spacing.6))",
  overflowX: "auto",
  p: "1.5",
  borderRadius: "lg",
  bg: "bg.default/82",
  borderWidth: "1px",
  borderColor: "orange.subtle.border",
  boxShadow: "md",
  backdropFilter: "blur(8px)",
  "& > button": {
    flex: "0 0 auto",
    w: "9",
    h: "9",
  },
});
