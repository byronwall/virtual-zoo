import { Link, Title } from "@solidjs/meta";
import { ZooApp } from "~/components/stuffed-zoo/ZooApp";
import { getSiteConfig } from "~/lib/site-config";

export default function HomeRoute() {
  const siteConfig = getSiteConfig();

  return (
    <>
      <Title>{siteConfig.title}</Title>
      <Link rel="preconnect" href="https://fonts.googleapis.com" />
      <Link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
      <Link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&display=swap"
      />
      <ZooApp />
    </>
  );
}
