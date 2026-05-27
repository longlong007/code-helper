import { useEffect, useState } from "react";
import MainPanel from "./views/MainPanel";
import FloatBall from "./views/FloatBall";
import QuickMenu from "./views/QuickMenu";

export default function App() {
  const [route, setRoute] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, "") || "/";
    return hash;
  });

  useEffect(() => {
    const onHash = () => {
      setRoute(window.location.hash.replace(/^#\/?/, "") || "/");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (route === "float") return <FloatBall />;
  if (route === "quick-menu") return <QuickMenu />;
  return <MainPanel />;
}
