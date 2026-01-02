import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import SessionReport from "@/components/SessionReport";

const SessionReportPage = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  // Guard: redirect if no sessionId
  useEffect(() => {
    if (!sessionId) {
      navigate('/practice', { replace: true });
    }
  }, [sessionId, navigate]);

  if (!sessionId) {
    return null;
  }

  const handleStartNew = () => {
    navigate('/');
  };

  return (
    <SessionReport 
      sessionId={sessionId} 
      onStartNew={handleStartNew} 
    />
  );
};

export default SessionReportPage;
