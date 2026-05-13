import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import BindingsPage from "./pages/BindingsPage";
import CameraEditorPage from "./pages/CameraEditorPage";
import { CTXGameRootDirectory } from "./contexts";
import { GameRootDirectoryState } from "./utils/fileSystemAccess";

function App() {
  const [gameRootDirectory, setGameRootDirectory] = useState<GameRootDirectoryState>({ rootDirectory: null, pathLabel: "" });

  return (
    <CTXGameRootDirectory.Provider value={[gameRootDirectory, setGameRootDirectory]}>
      <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/bindings" element={<BindingsPage />} />
      <Route path="/cameras" element={<CameraEditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CTXGameRootDirectory.Provider>
  );
}

export default App;
