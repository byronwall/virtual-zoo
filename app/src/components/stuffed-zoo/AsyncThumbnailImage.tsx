import { createSignal, splitProps, type JSX } from "solid-js";
import { css, cx } from "styled-system/css";

type AsyncThumbnailImageProps = Omit<
  JSX.ImgHTMLAttributes<HTMLImageElement>,
  "onError" | "onLoad"
> & {
  fallbackSrc?: string;
};

export function AsyncThumbnailImage(props: AsyncThumbnailImageProps) {
  const [local, imageProps] = splitProps(props, ["class", "fallbackSrc"]);
  const [failedOver, setFailedOver] = createSignal(false);

  return (
    <img
      {...imageProps}
      src={failedOver() && local.fallbackSrc ? local.fallbackSrc : imageProps.src}
      class={cx(thumbnailImageClass, local.class)}
      loading={imageProps.loading ?? "lazy"}
      decoding={imageProps.decoding ?? "async"}
      onError={() => {
        if (local.fallbackSrc && !failedOver()) {
          setFailedOver(true);
        }
      }}
    />
  );
}

const thumbnailImageClass = css({
  bg: "amber.subtle.bg",
  backgroundImage:
    "linear-gradient(135deg, rgba(255,255,255,.82), rgba(255,255,255,0)), radial-gradient(circle at 50% 42%, rgba(245,158,11,.18) 0 34%, transparent 36%)",
});
