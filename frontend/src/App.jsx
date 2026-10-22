import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import SpaceBackground from "./components/SpaceBackground";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import LandingPage from "./pages/LandingPage";
import NotesPage from "./pages/NotesPage";
import StatsPage from "./pages/StatsPage";

// these load only when opened (keeps the first page fast)
const ChatPage = lazy(() => import("./pages/ChatPage"));
const ReviewPage = lazy(() => import("./pages/ReviewPage"));
const ResumeListPage = lazy(() => import("./pages/ResumeListPage"));
const ResumeEditorPage = lazy(() => import("./pages/ResumeEditorPage"));

const loading = <p className="text-mute">Loading…</p>;

export default function App() {
  const { pathname } = useLocation();
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-clay px-4 py-2 font-semibold text-[#1a1918] focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SpaceBackground dim={pathname !== "/"} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<NotesPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route
            path="chat"
            element={
              <Suspense fallback={loading}>
                <ChatPage />
              </Suspense>
            }
          />
          <Route
            path="review"
            element={
              <Suspense fallback={loading}>
                <ReviewPage />
              </Suspense>
            }
          />
          <Route
            path="resume"
            element={
              <Suspense fallback={loading}>
                <ResumeListPage />
              </Suspense>
            }
          />
          <Route
            path="resume/:id"
            element={
              <Suspense fallback={loading}>
                <ResumeEditorPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
