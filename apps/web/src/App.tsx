import { BrowserRouter, Routes, Route } from "react-router-dom";
import AadhaarLoginPage from "@/pages/auth/AadhaarLoginPage";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Layout } from "@/components/shared/Layout";
import { RoleRedirect } from "@/components/shared/RoleRedirect";
import NurseDashboard from "@/pages/nurse/NurseDashboard";
import AddPatient from "@/pages/nurse/AddPatient";
import EditPatient from "@/pages/nurse/EditPatient";
import NurseHistory from "@/pages/nurse/NurseHistory";
import DoctorDashboard from "@/pages/doctor/DoctorDashboard";
import ConsultPage from "@/pages/doctor/ConsultPage";
import DoctorAppointments from "@/pages/doctor/DoctorAppointments";
import VideoCallPage from "@/pages/doctor/VideoCallPage";
import DoctorHistory from "@/pages/doctor/DoctorHistory";
import PatientDetailPage from "@/pages/doctor/PatientDetailPage";
import PatientPortal from "@/pages/patient/PatientPortal";
import PatientHistory from "@/pages/patient/PatientHistory";
import SettingsPage from "@/pages/shared/SettingsPage";
import PublicVideoRoom from "@/pages/shared/PublicVideoRoom";
import FollowUpList from "@/pages/shared/FollowUpList";
import FollowUpConsultPage from "@/pages/doctor/FollowUpConsultPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/signin" element={<AadhaarLoginPage />} />
        <Route path="/video-room/:roomId" element={<PublicVideoRoom />} />

        {/* Protected */}
        <Route
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route path="/nurse" element={<NurseDashboard />} />
          <Route path="/nurse/add-patient" element={<AddPatient />} />
          <Route path="/nurse/edit-patient/:id" element={<EditPatient />} />
          <Route path="/nurse/history" element={<NurseHistory />} />
          <Route path="/nurse/follow-ups" element={<FollowUpList />} />
          <Route path="/nurse/settings" element={<SettingsPage />} />
          <Route path="/doctor" element={<DoctorDashboard />} />
          <Route path="/doctor/appointments" element={<DoctorAppointments />} />
          <Route path="/doctor/video-call/:id" element={<VideoCallPage />} />
          <Route path="/doctor/consult/:patientId" element={<ConsultPage />} />
          <Route path="/doctor/history" element={<DoctorHistory />} />
          <Route path="/doctor/patient/:patientId" element={<PatientDetailPage />} />
          <Route path="/doctor/follow-ups" element={<FollowUpList />} />
          <Route path="/doctor/follow-up-consult/:followUpId" element={<FollowUpConsultPage />} />
<Route path="/doctor/settings" element={<SettingsPage />} />
          <Route path="/patient" element={<PatientPortal />} />
          <Route path="/patient/history" element={<PatientHistory />} />
          <Route path="/patient/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<RoleRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
