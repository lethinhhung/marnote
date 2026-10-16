import { getWelcomeMessage } from "@marnote/core";

export function App() {
  return (
    <main className="welcome">
      <span className="eyebrow">YOUR LOCAL WORKSPACE</span>
      <h1>Marnote</h1>
      <p>{getWelcomeMessage()}</p>
      <button type="button">Open a workspace</button>
    </main>
  );
}
