import Dashboard from "./Dashboard";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePublic from "./HomePublic";
import Callback from "./Callback";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
 return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePublic />} />

        <Route path="/callback" element={<Callback />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
