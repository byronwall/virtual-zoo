import { Link, Title } from "@solidjs/meta";
import { ZooApp } from "~/components/stuffed-zoo/ZooApp";

export default function HomeRoute() {
  return (
    <>
      <Title>Violet's Stuffed Animal Zoo</Title>
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
