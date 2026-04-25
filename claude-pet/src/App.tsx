import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Pet from "./components/Pet";
import MiniChat from "./components/MiniChat";

function App() {
  const [windowLabel, setWindowLabel] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const win = getCurrentWindow();
      setWindowLabel(win.label);
    };
    init();
  }, []);

  if (windowLabel === "mini-chat") {
    return <MiniChat />;
  }

  return <Pet />;
}

export default App;
