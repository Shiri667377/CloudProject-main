import Dashboard from "./Dashboard";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePublic from "./HomePublic";
import Callback from "./Callback";
import ProtectedRoute from "./ProtectedRoute";

export default function App() {
 return (
    <BrowserRouter>
      <Routes>
        {/* מסך בית – לא מחוברים */}
        <Route path="/" element={<HomePublic />} />

        {/* חזרה מ-Cognito */}
        <Route path="/callback" element={<Callback />} />

        {/* דאשבורד – רק למחוברים */}
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
