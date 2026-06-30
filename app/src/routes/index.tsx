import { Title } from "@solidjs/meta";
import { ZooApp } from "~/components/stuffed-zoo/ZooApp";

export default function HomeRoute() {
  return (
    <>
      <Title>Violet's Stuffed Animal Zoo</Title>
      <ZooApp />
    </>
  );
}
