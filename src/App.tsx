import { Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import BindingsPage from "./pages/BindingsPage";
import CameraEditorPage from "./pages/CameraEditorPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/bindings" element={<BindingsPage />} />
      <Route path="/cameras" element={<CameraEditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
