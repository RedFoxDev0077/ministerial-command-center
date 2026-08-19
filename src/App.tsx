import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { MainLayout } from "@/components/layout/MainLayout";
import { VirtualAssistant } from "@/components/ui/virtual-assistant";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PublicDocumentView from "./pages/PublicDocumentView";
import Dashboard from "./pages/Dashboard";
import InboxPage from "./pages/Inbox";
import NewEntry from "./pages/NewEntry";
import OutboxPage from "./pages/Outbox";
import CasesPage from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import CreateExpediente from "./pages/CreateExpediente";
import DeadlinesPage from "./pages/Deadlines";
import AIAssistant from "./pages/AIAssistant";
import MultimediaPage from "./pages/Multimedia";
import SignaturePage from "./pages/Signature";
import ArchivePage from "./pages/Archive";
import ContentPage from "./pages/Content";
import AgendaPage from "./pages/Agenda";
import WhatsAppBotPage from "./pages/WhatsAppBot";
import AuditPage from "./pages/Audit";
import SecurityPage from "./pages/Security";
import { AdminSecurity } from "./pages/AdminSecurity";
import EntitiesPage from "./pages/Entities";
import DepartmentsPage from "./pages/Departments";
import UsersPage from "./pages/Users";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Redirect component for old QR codes
const DocumentsRedirect = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Redirect old /documents/:id to new /document/:id
  useEffect(() => {
    if (id) {
      navigate(`/document/${id}`, { replace: true });
    }
  }, [id, navigate]);

  return null;
};

const App = () => (
  // Outermost, so a crash anywhere below renders a message instead of a blank
  // page. Providers sit inside it and are covered too.
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/document/:id" element={<PublicDocumentView />} />
              {/* Redirect old QR code URLs to new format */}
              <Route path="/documents/:id" element={<DocumentsRedirect />} />

              {/* Protected routes */}
              <Route element={
                <AuthGuard>
                  <>
                    <MainLayout />
                    <VirtualAssistant />
                  </>
                </AuthGuard>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/inbox" element={<InboxPage />} />
                <Route path="/inbox/new" element={<NewEntry />} />
                <Route path="/new-entry" element={<NewEntry />} />
                <Route path="/outbox" element={<OutboxPage />} />
                <Route path="/outbox/new" element={<NewEntry />} />
                <Route path="/cases" element={<CasesPage />} />
                <Route path="/cases/new" element={<CreateExpediente />} />
                <Route path="/cases/:id" element={<CaseDetail />} />
                <Route path="/deadlines" element={<DeadlinesPage />} />
                <Route path="/assistant" element={<AIAssistant />} />
                <Route path="/multimedia" element={<MultimediaPage />} />
                <Route path="/signature" element={<SignaturePage />} />
                <Route path="/archive" element={<ArchivePage />} />
                <Route path="/agenda" element={<AgendaPage />} />
                <Route path="/whatsapp" element={<WhatsAppBotPage />} />
                <Route path="/content" element={<ContentPage />} />
                <Route path="/audit" element={<AuditPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/admin/security" element={<AdminSecurity />} />
                <Route path="/entities" element={<EntitiesPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
