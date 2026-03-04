import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import SessionReport from "@/components/SessionReport";

const SessionReportPage = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();

  useEffect(() => {
    if (!sessionId) {
      navigate('/home/practice', { replace: true });
    }
  }, [sessionId, navigate]);

  if (!sessionId) {
    return null;
  }

  const handleStartNew = () => {
    navigate('/home');
  };

  return (
    <SessionReport 
      sessionId={sessionId} 
      onStartNew={handleStartNew} 
    />
  );
};

export default SessionReportPage;
