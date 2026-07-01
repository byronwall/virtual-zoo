// Nitro plugin entrypoints do not resolve the app `~` alias during the server build.
// eslint-disable-next-line @dword-design/import-alias/prefer-alias
import { ensureBackgroundRemovalRecoveryStarted } from "../lib/stuffed-zoo/image-processing";

export default function stuffedZooRecoveryPlugin() {
  ensureBackgroundRemovalRecoveryStarted();
}
