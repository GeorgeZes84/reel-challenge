import { DirectorGame } from "./components/DirectorGame";

export default function Home() {
  return <DirectorGame initialSeed={crypto.randomUUID()} />;
}
